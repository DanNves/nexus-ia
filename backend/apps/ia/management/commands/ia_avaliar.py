"""Roda os casos de avaliação de qualidade com o provedor ativo (IA_PROVEDOR) e mostra o placar.

Uso: python manage.py ia_avaliar [--tarefa requisitos|sugestao_suporte] [--caso AV-REQ-01] [--intervalo 4] [--saida]
Com o Gemini real, cada caso é uma geração (mais reservas se houver 503). Use com moderação (free tier) e registre
o placar em `claude/ia.md`. Nunca mostra a chave.
"""
import json
import time

from django.core.management.base import BaseCommand, CommandError

from apps.ia.adapters import criar_provedor
from apps.ia.avaliacao.casos import casos
from apps.ia.avaliacao.executar import avaliar_caso
from apps.ia.domain.tarefas import TAREFAS


class Command(BaseCommand):
    help = 'Avalia a qualidade das gerações de IA com casos fixos e critérios automáticos.'

    def add_arguments(self, parser):
        parser.add_argument('--tarefa', choices=sorted(TAREFAS))
        parser.add_argument('--caso', help='id do caso, ex.: AV-REQ-01')
        parser.add_argument('--intervalo', type=float, default=4.0,
                            help='segundos entre casos, para respeitar o limite por minuto do free tier (padrão 4)')
        parser.add_argument('--saida', action='store_true', help='mostra o JSON gerado em cada caso')

    def handle(self, *args, tarefa=None, caso=None, intervalo=4.0, saida=False, **opcoes):
        selecionados = casos(tarefa, caso)
        if not selecionados:
            raise CommandError('Nenhum caso encontrado com esse filtro.')
        provedor = criar_provedor()
        self.stdout.write(f'Provedor: {provedor.nome} | cadeia: {", ".join(provedor.modelos)} | real: {provedor.real} '
                          f'| casos: {len(selecionados)}')

        resultados = []
        for i, k in enumerate(selecionados):
            if i and provedor.real and intervalo > 0:
                time.sleep(intervalo)
            r = avaliar_caso(k, provedor)
            resultados.append(r)
            if not r.executou:
                self.stdout.write(self.style.WARNING(
                    f'[NÃO EXECUTOU] {k.id} (prompt v{r.prompt_versao}) após {r.tentativas} tentativa(s), '
                    f'{r.duracao_s:.1f} s: {r.erro}'))
                continue
            estilo = self.style.SUCCESS if r.passou else self.style.ERROR
            self.stdout.write(estilo(
                f'[{"PASSOU" if r.passou else "FALHOU"}] {k.id} (prompt v{r.prompt_versao}) | {r.modelo} | '
                f'{r.tentativas} tentativa(s) | {r.duracao_s:.1f} s | critérios {len(r.aprovados)}/'
                f'{len(r.aprovados) + len(r.falhas)}'))
            for falha in r.falhas:
                self.stdout.write(f'    - {falha}')
            if saida:
                self.stdout.write(json.dumps(r.saida, ensure_ascii=False, indent=2))

        executados = [r for r in resultados if r.executou]
        passaram = sum(r.passou for r in executados)
        criterios_ok = sum(len(r.aprovados) for r in executados)
        criterios_total = sum(len(r.aprovados) + len(r.falhas) for r in executados)
        self.stdout.write(f'\nPlacar: {passaram}/{len(executados)} casos passaram | critérios {criterios_ok}/'
                          f'{criterios_total} | não executados: {len(resultados) - len(executados)}')
