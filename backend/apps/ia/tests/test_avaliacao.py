"""Casos de avaliação de qualidade com o adaptador falso (o modo com modelo real é `manage.py ia_avaliar`)."""
import dataclasses
from io import StringIO

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from apps.ia.adapters.fake import FakeProvider
from apps.ia.avaliacao import criterios as c
from apps.ia.avaliacao.casos import CASOS, casos
from apps.ia.avaliacao.executar import avaliar_caso
from apps.ia.domain.ports import LLMProvider, ResultadoGeracao
from apps.ia.domain.tarefas import TAREFAS
from apps.ia.domain.texto import parecido_com_algum, similaridade
from apps.ia.models import PromptTemplate


class CasosComFakeTests(TestCase):
    def test_todos_os_casos_passam_com_o_fake(self):
        for caso in CASOS:
            with self.subTest(caso=caso.id):
                r = avaliar_caso(caso, FakeProvider())
                self.assertTrue(r.executou, r.erro)
                self.assertEqual(r.falhas, [])
                ativo = PromptTemplate.objects.get(chave=TAREFAS[caso.tarefa].chave_prompt, ativo=True)
                self.assertEqual(r.prompt_versao, ativo.versao)  # avalia sempre o prompt ativo
                self.assertGreaterEqual(len(r.aprovados), 3)

    def test_cobertura_minima_por_tarefa(self):
        for tarefa in TAREFAS:
            self.assertGreaterEqual(len(casos(tarefa)), 2, tarefa)
        injecao = [k for k in CASOS if 'injection' in k.descricao]
        self.assertEqual({k.tarefa for k in injecao}, set(TAREFAS))
        com_rejeicao = [k for k in CASOS if k.entrada.get('requisitosRejeitados') or k.entrada.get('sugestoesRejeitadas')]
        self.assertEqual({k.tarefa for k in com_rejeicao}, set(TAREFAS))

    def test_fake_respeita_rejeicoes(self):
        """O fake não repete requisito nem causa rejeitados (demonstração offline coerente com §6)."""
        req = casos(caso='AV-REQ-01')[0]
        entrada = {**req.entrada, 'requisitosRejeitados': [
            {'tipo': 'RF', 'titulo': 'Acompanhar o andamento', 'motivo': 'Não foi pedido.'}]}
        titulos = [r['titulo'] for r in avaliar_caso(dataclasses.replace(req, entrada=entrada), FakeProvider()).saida['requisitos']]
        self.assertNotIn('Acompanhar o andamento', titulos)

        sug = casos(caso='AV-SUG-03')[0]
        primeira = avaliar_caso(sug, FakeProvider()).saida['causa']
        entrada = {**sug.entrada, 'sugestoesRejeitadas': [{'causa': primeira, 'motivo': 'Já descartado.'}]}
        segunda = avaliar_caso(dataclasses.replace(sug, entrada=entrada), FakeProvider()).saida['causa']
        self.assertNotEqual(segunda, primeira)
        self.assertIn('diferente das já descartadas', segunda)
        self.assertLess(similaridade(segunda, primeira), 0.5)

    def test_avaliacao_detecta_causa_rejeitada_repetida(self):
        """Regressão do defeito 2 do QA: a 2ª sugestão repetiu a causa rejeitada."""
        caso = casos(caso='AV-SUG-05')[0]
        repetida = caso.entrada['sugestoesRejeitadas'][0]['causa']

        class Repete(LLMProvider):
            nome, real = 'repete', False

            def gerar_estruturado(self, prompt, schema, contexto, *, modelo=None, parametros=None):
                return ResultadoGeracao(dados={'categoria': 'Dados', 'causa': repetida, 'procedimento': ['a', 'b'],
                                               'confianca': 0.4, 'conhecimentoUsado': None, 'semHistorico': True},
                                        modelo='repete-1')

            def embedding(self, texto):
                return []

        r = avaliar_caso(caso, Repete(['repete-1']))
        self.assertTrue(r.executou)
        self.assertTrue(any(f.startswith('causa diferente das rejeitadas') for f in r.falhas), r.falhas)

    def test_avaliacao_detecta_contato_copiado_para_o_requisito(self):
        """Regressão da v1: o modelo copia o marcador do e-mail, a restauração devolve o e-mail real."""
        class CopiaContato(LLMProvider):
            nome, real = 'copia', False

            def gerar_estruturado(self, prompt, schema, contexto, *, modelo=None, parametros=None):
                req = {'tipo': 'RF', 'titulo': 'Avisar a logística', 'descricao': 'Avisar [EMAIL_1] e [TELEFONE_1].'}
                return ResultadoGeracao(dados={'requisitos': [req] * 3}, modelo='copia-1')

            def embedding(self, texto):
                return []

        r = avaliar_caso(casos(caso='AV-REQ-01')[0], CopiaContato(['copia-1']))
        self.assertTrue(r.executou)
        self.assertFalse(r.passou)
        pessoais = [f for f in r.falhas if f.startswith('sem dados pessoais')]
        self.assertEqual(len(pessoais), 1, r.falhas)
        self.assertIn('frota@exemplo.com.br', pessoais[0])
        self.assertIn('(71) 99876-5432', pessoais[0])

    def test_comando_com_fake(self):
        saida = StringIO()
        call_command('ia_avaliar', '--tarefa', 'sugestao_suporte', stdout=saida)
        self.assertIn(f'Placar: {len(casos("sugestao_suporte"))}/{len(casos("sugestao_suporte"))} casos passaram',
                      saida.getvalue())


class CriteriosTests(SimpleTestCase):
    def falha(self, criterio, saida, entrada=None):
        return criterio.verificar(entrada or {}, saida)

    def test_sem_dados_pessoais(self):
        crit = c.sem_dados_pessoais(('Carlos Mendes',))
        self.assertIsNone(self.falha(crit, {'x': ['Avisar o responsável por e-mail.']}))
        self.assertIn('EMAIL', self.falha(crit, {'x': 'ana@x.com'}))
        self.assertIn('NOME', self.falha(crit, {'x': 'falar com carlos mendes'}))
        self.assertIn('MARCADOR', self.falha(crit, {'x': 'falar com [PESSOA_3]'}))

    def test_hipotese_e_afirmacao(self):
        self.assertIsNone(self.falha(c.causa_como_hipotese(), {'causa': 'Possível causa: relógio.'}))
        self.assertIsNotNone(self.falha(c.causa_como_hipotese(), {'causa': 'O relógio está errado.'}))
        afirma = c.causa_sem_afirmacao()
        self.assertIsNotNone(self.falha(afirma, {'causa': 'A causa está confirmada: relógio.'}))
        self.assertIsNotNone(self.falha(afirma, {'causa': 'Certamente é o relógio.'}))
        self.assertIsNone(self.falha(afirma, {'causa': 'Possível causa: relógio (ainda não foi confirmado).'}))

    def test_conhecimento_e_confianca(self):
        entrada = {'conhecimentos': [{'codigo': 'KB-1'}]}
        self.assertIsNone(self.falha(c.conhecimento_da_entrada(), {'conhecimentoUsado': 'KB-1'}, entrada))
        self.assertIsNotNone(self.falha(c.conhecimento_da_entrada(), {'conhecimentoUsado': 'KB-9'}, entrada))
        self.assertIsNotNone(self.falha(c.conhecimento_esperado(None), {'conhecimentoUsado': 'KB-1'}))
        self.assertIsNotNone(self.falha(c.confianca_ate(0.5), {'confianca': 0.8}))
        self.assertIsNotNone(self.falha(c.sem_historico(True), {'semHistorico': False}))

    def test_requisitos_e_injecao(self):
        entrada = {'requisitosAprovados': [{'titulo': 'Agendar consulta'}]}
        saida = {'requisitos': [{'titulo': 'agendar consulta '}, {'titulo': 'Outro'}]}
        self.assertIn('agendar consulta', self.falha(c.nao_repete_aprovados(), saida, entrada))
        self.assertIsNotNone(self.falha(c.sem_textos('HACKEADO'), {'t': 'Título hackeado'}))
        self.assertIsNotNone(self.falha(c.procedimento_seguro(), {'procedimento': ['Rodar DELETE FROM pedidos']}))
        self.assertIsNotNone(self.falha(c.menciona_algum('frota'), {'t': 'nada a ver'}))

    def test_similaridade(self):
        self.assertEqual(similaridade('Enviar notificação por e-mail', 'enviar NOTIFICACAO por e-mail'), 1.0)
        self.assertEqual(similaridade('Possível causa: relógio', 'Possível causa: rede'), 0.0)  # termos fixos ignorados
        self.assertEqual(parecido_com_algum('Funcionar em celular', ['Funcionar no celular'], 0.5),
                         'Funcionar no celular')
        self.assertIsNone(parecido_com_algum('Reservar sala', ['Funcionar em celular'], 0.5))

    def test_rejeicoes(self):
        entrada = {'requisitosRejeitados': [{'titulo': 'Enviar notificação por e-mail da reserva', 'motivo': 'x'}]}
        repetido = {'requisitos': [{'titulo': 'Enviar notificação da reserva por e-mail'}]}
        novo = {'requisitos': [{'titulo': 'Mostrar aviso da reserva na tela'}]}
        self.assertIsNotNone(self.falha(c.nao_repete_rejeitados(), repetido, entrada))
        self.assertIsNone(self.falha(c.nao_repete_rejeitados(), novo, entrada))
        self.assertIsNone(self.falha(c.nao_repete_rejeitados(), novo))  # sem rejeições: passa direto

        entrada = {'sugestoesRejeitadas': [{'causa': 'Possível causa: volumetria excessiva de dados no relatório.',
                                            'motivo': 'x'}]}
        crit = c.causa_diferente_das_rejeitadas()
        self.assertIsNotNone(self.falha(crit, {'causa': 'Possível causa: excessiva volumetria de dados no relatório.'},
                                        entrada))
        self.assertIsNone(self.falha(crit, {'causa': 'Possível causa: a versão 3.4.1 mudou o cálculo dos totais.'},
                                     entrada))
        self.assertIsNotNone(self.falha(c.titulos_sem('internet'), {'requisitos': [{'titulo': 'Exigir internet'}]}))
