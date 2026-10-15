"""Faz UMA geração com o provedor ativo (IA_PROVEDOR) e mostra modelo, duração, tokens e o JSON.

Uso: python manage.py ia_testar [--tarefa requisitos|sugestao_suporte]
Não cria Job; grava LogIA (job vazio) como qualquer outra tentativa. Nunca mostra a chave.
"""
import json
import time

from django.core.management.base import BaseCommand, CommandError

from apps.ia.adapters import criar_provedor
from apps.ia.domain.tarefas import TAREFAS
from apps.ia.services.geracao import FalhaGeracao, gerar

EXEMPLOS = {
    'requisitos': {
        'demanda': {
            'codigo': 'DEM-099',
            'nome': 'Agenda de manutenção da frota',
            'descricao': 'Controlar as revisões dos veículos da empresa e avisar quando estiverem perto do prazo.',
            'cenario': 'Aplicação web',
            'necessidade': [
                'Hoje controlamos as revisões numa planilha e já perdemos prazos. Quem cuida é a equipe de '
                'logística (contato: frota@exemplo.com.br, (71) 99876-5432). Queremos ver os veículos, a '
                'quilometragem e receber aviso antes da revisão vencer.'
            ],
            'respostas': [
                {'pergunta': 'Quem vai usar o sistema no dia a dia?', 'respostas': ['Uma equipe interna']},
                {'pergunta': 'Onde o sistema será usado?', 'respostas': ['No computador', 'No celular']},
            ],
        },
        'requisitosAprovados': [],
    },
    'sugestao_suporte': {
        'chamado': {'codigo': 'CH-028', 'titulo': 'Falha na autenticação após atualização',
                    'descricao': 'Depois da versão 1.2.0 alguns usuários não conseguem entrar com o código de 2 fatores.',
                    'prioridade': 'Alta'},
        'solucao': {'nome': 'Portal de Atendimento', 'versao': '1.2.0'},
        'requisitos': [{'codigo': 'REQ-014', 'titulo': 'Recuperação de senha',
                        'descricao': 'O usuário pode redefinir a senha por e-mail.'}],
        'conhecimentos': [{'codigo': 'KB-007', 'titulo': 'Falha de autenticação na v1.2.0',
                           'procedimento': ['Conferir o horário do servidor', 'Reenviar o código ao usuário']}],
        'chamadosResolvidos': [],
    },
}


class Command(BaseCommand):
    help = 'Testa o provedor de IA ativo com uma geração real (custo zero no free tier do Gemini).'

    def add_arguments(self, parser):
        parser.add_argument('--tarefa', default='requisitos', choices=sorted(TAREFAS))

    def handle(self, *args, tarefa, **opcoes):
        provedor = criar_provedor()
        self.stdout.write(f'Provedor: {provedor.nome} | cadeia: {", ".join(provedor.modelos)} | real: {provedor.real}')
        inicio = time.monotonic()
        try:
            geracao = gerar(TAREFAS[tarefa], EXEMPLOS[tarefa], provedor=provedor)
        except FalhaGeracao as exc:
            raise CommandError(f'Falhou após {exc.tentativas} tentativa(s): {exc.mensagem}') from None
        r = geracao.resultado
        total = time.monotonic() - inicio
        self.stdout.write(self.style.SUCCESS(
            f'Modelo: {r.modelo} | tentativas: {geracao.tentativas} | chamada: {r.duracao_ms} ms | total: {total:.1f} s'))
        self.stdout.write(f'Tokens: entrada {r.tokens_entrada}, saída {r.tokens_saida}, raciocínio {r.tokens_raciocinio}'
                          f' | substituições na anonimização: {geracao.substituicoes}')
        self.stdout.write(json.dumps(geracao.dados, ensure_ascii=False, indent=2))
