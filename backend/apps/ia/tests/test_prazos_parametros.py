"""Prazos da cadeia de reserva, expiração do job e parâmetros por tarefa (timeout, raciocínio, limite de saída)."""
import dataclasses
import json
from datetime import timedelta
from unittest import mock

import httpx
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone

from apps.ia.adapters.gemini import GeminiProvider
from apps.ia.adapters.openai_compat import OpenAICompatProvider
from apps.ia.domain.anonimizacao import dados_pessoais_em
from apps.ia.domain.ports import ErroProvedor, LLMProvider, ParametrosGeracao, ResultadoGeracao
from apps.ia.domain.prazos import TIMEOUT_CONEXAO_S, prazo_expiracao, prazo_nova_tentativa
from apps.ia.domain.tarefas import TAREFAS, Tarefa
from apps.ia.models import Job, LogIA
from apps.ia.services import jobs
from apps.ia.services.geracao import FalhaGeracao, gerar

SCHEMA = {'type': 'object', 'properties': {'ok': {'type': 'string', 'maxLength': 10}}, 'required': ['ok'],
          'additionalProperties': False}
CONTEXTO = {'tarefa': 'x', 'entrada': {'a': 1}}
ENTRADA_SUGESTAO = {'chamado': {'codigo': 'CH-1', 'titulo': 'Erro', 'descricao': 'Falha', 'prioridade': 'Alta'},
                    'requisitos': [], 'conhecimentos': [], 'chamadosResolvidos': []}
SUGESTAO_OK = {'categoria': 'Outro', 'causa': 'Possível causa: indefinida.', 'procedimento': ['a', 'b'],
               'confianca': 0.3, 'conhecimentoUsado': None, 'semHistorico': True}


class PrazosDominioTests(SimpleTestCase):
    def test_ultima_tentativa_termina_antes_da_expiracao(self):
        for t in (3, 5, 10, 20, 30, 60, 120):
            with self.subTest(timeout=t):
                self.assertLess(prazo_nova_tentativa(t) + t + TIMEOUT_CONEXAO_S, prazo_expiracao(t))

    def test_valores_com_timeout_20(self):
        self.assertEqual((prazo_nova_tentativa(20), prazo_expiracao(20)), (35, 75))
        self.assertEqual(prazo_nova_tentativa(2), 0)

    def test_tarefa_valida_parametros(self):
        base = TAREFAS['requisitos']
        for campo, valor in (('nivel_raciocinio', 'turbo'), ('timeout_segundos', 0), ('max_tokens_saida', -1)):
            with self.subTest(campo=campo), self.assertRaises(ValueError):
                dataclasses.replace(base, **{campo: valor})

    def test_catalogo_nao_usa_minimal_e_limita_saida(self):
        # gemini-3.8-flash (principal) não aceita `minimal`: 400 encerraria a cadeia sem tentar a reserva.
        for tarefa in TAREFAS.values():
            with self.subTest(tarefa=tarefa.chave):
                self.assertNotEqual(tarefa.nivel_raciocinio, 'minimal')
                self.assertGreater(tarefa.max_tokens_saida or 0, 0)

    def test_dados_pessoais_em(self):
        texto = ('Fale com ana@x.com ou (71) 99876-5432; CPF 123.456.789-09; CNPJ 12.345.678/0001-90; '
                 '[PESSOA_1]; versão 1.2.0')
        tipos = sorted(tipo for tipo, _ in dados_pessoais_em(texto))
        self.assertEqual(tipos, ['CNPJ', 'CPF', 'EMAIL', 'MARCADOR', 'TELEFONE'])
        self.assertEqual(dados_pessoais_em('Enviar aviso por e-mail ao responsável na versão 1.2.0.'), [])


class Relogio:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


class ProvedorCronometrado(LLMProvider):
    """Cada modelo "demora" o tempo indicado no relógio simulado e falha com erro temporário (ou responde)."""

    nome = 'cronometrado'
    real = False

    def __init__(self, relogio, duracoes: dict, sucesso: str | None = None):
        super().__init__(list(duracoes))
        self.relogio, self.duracoes, self.sucesso = relogio, duracoes, sucesso
        self.chamados: list[tuple[str, ParametrosGeracao]] = []

    def gerar_estruturado(self, prompt, schema, contexto, *, modelo=None, parametros=None):
        self.chamados.append((modelo, parametros))
        self.relogio.t += self.duracoes[modelo]
        if modelo == self.sucesso:
            return ResultadoGeracao(dados=SUGESTAO_OK, modelo=modelo)
        raise ErroProvedor('ocupado', temporario=True, codigo='timeout')

    def embedding(self, texto):
        return []


@override_settings(IA_TIMEOUT_SEGUNDOS=20)
class PrazoDaCadeiaTests(TestCase):
    def rodar(self, duracoes, sucesso=None, tarefa=None):
        relogio = Relogio()
        provedor = ProvedorCronometrado(relogio, duracoes, sucesso)
        with mock.patch('apps.ia.services.geracao._agora', relogio):
            try:
                gerar(tarefa or TAREFAS['sugestao_suporte'], ENTRADA_SUGESTAO, provedor=provedor)
            except FalhaGeracao:
                pass
        return [m for m, _ in provedor.chamados], provedor

    def test_nao_inicia_tentativa_depois_de_2t_menos_5(self):
        self.assertEqual(self.rodar({'a': 36, 'b': 1, 'c': 1})[0], ['a'])        # 36 s > 35 s

    def test_inicia_antes_do_prazo_e_para_depois(self):
        self.assertEqual(self.rodar({'a': 34, 'b': 20, 'c': 1})[0], ['a', 'b'])  # b começa em 34 s; c em 54 s não

    def test_falhas_rapidas_percorrem_a_cadeia_inteira(self):
        chamados, _ = self.rodar({'a': 1, 'b': 1, 'c': 1}, sucesso='c')
        self.assertEqual(chamados, ['a', 'b', 'c'])
        self.assertEqual(LogIA.objects.filter(sucesso=True).count(), 1)

    def test_timeout_da_tarefa_muda_o_prazo_e_vai_ao_adaptador(self):
        lenta = dataclasses.replace(TAREFAS['sugestao_suporte'], timeout_segundos=60, nivel_raciocinio='medium')
        chamados, provedor = self.rodar({'a': 100, 'b': 1}, tarefa=lenta)  # prazo = 2×60 − 5 = 115 s
        self.assertEqual(chamados, ['a', 'b'])
        parametros = provedor.chamados[0][1]
        self.assertEqual((parametros.timeout_segundos, parametros.nivel_raciocinio, parametros.max_tokens_saida),
                         (60, 'medium', TAREFAS['sugestao_suporte'].max_tokens_saida))
        log = LogIA.objects.first()
        self.assertEqual((log.parametros['timeoutSegundos'], log.parametros['nivelRaciocinio']), (60, 'medium'))

    def test_sem_parametro_da_tarefa_usa_settings(self):
        _, provedor = self.rodar({'a': 1})
        parametros = provedor.chamados[0][1]
        self.assertEqual((parametros.timeout_segundos, parametros.nivel_raciocinio), (20, None))


@override_settings(IA_TIMEOUT_SEGUNDOS=20)
class ExpiracaoDoJobTests(TestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(username='eq', password='x', nome='Eq', perfil='EQUIPE')

    def job_iniciado_ha(self, segundos, tarefa='requisitos'):
        return Job.objects.create(tarefa=tarefa, alvo_tipo='demanda', alvo_id='D', solicitante=self.usuario,
                                  estado='EM_EXECUCAO', iniciado_em=timezone.now() - timedelta(seconds=segundos))

    def test_nao_expira_entre_3t_e_3t_mais_margem(self):
        # Antes expirava em 3T = 60 s, enquanto a 3ª tentativa ainda podia terminar com sucesso.
        job = self.job_iniciado_ha(70)
        self.assertEqual(jobs.consultar_job(self.usuario, job.id).estado, 'EM_EXECUCAO')

    def test_expira_depois_de_3t_mais_margem(self):
        job = self.job_iniciado_ha(80)
        self.assertEqual(jobs.consultar_job(self.usuario, job.id).estado, 'FALHOU')

    def test_expiracao_usa_timeout_da_tarefa(self):
        lenta = dataclasses.replace(TAREFAS['requisitos'], timeout_segundos=60)
        job = self.job_iniciado_ha(100)
        with mock.patch.dict(TAREFAS, {'requisitos': lenta}):
            self.assertEqual(jobs.consultar_job(self.usuario, job.id).estado, 'EM_EXECUCAO')  # limite 195 s


def resposta_gemini(texto):
    return {'candidates': [{'content': {'parts': [{'text': texto}]}, 'finishReason': 'STOP'}], 'usageMetadata': {}}


class ParametrosNosAdaptadoresTests(SimpleTestCase):
    def capturar(self, recebido, resposta):
        def handler(request):
            recebido['corpo'] = json.loads(request.content)
            recebido['timeout'] = request.extensions.get('timeout')
            return httpx.Response(200, json=resposta)
        return httpx.MockTransport(handler)

    def gemini(self, recebido, **kwargs):
        return GeminiProvider(api_key='k', modelos=['m'], url_base='https://g.teste', timeout=60,
                              transport=self.capturar(recebido, resposta_gemini('{"ok": "sim"}')), **kwargs)

    def test_gemini_usa_parametros_da_tarefa(self):
        recebido = {}
        self.gemini(recebido).gerar_estruturado('p', SCHEMA, CONTEXTO, parametros=ParametrosGeracao(
            timeout_segundos=7, nivel_raciocinio='high', max_tokens_saida=123))
        config = recebido['corpo']['generationConfig']
        self.assertEqual(config['maxOutputTokens'], 123)
        self.assertEqual(config['thinkingConfig'], {'thinkingLevel': 'high'})
        self.assertEqual(config['responseJsonSchema'], SCHEMA)  # Gemini recebe o maxLength
        self.assertEqual(recebido['timeout'], {'connect': 5.0, 'read': 7, 'write': 7, 'pool': 7})

    def test_gemini_sem_parametros_usa_padroes(self):
        recebido = {}
        self.gemini(recebido).gerar_estruturado('p', SCHEMA, CONTEXTO)
        config = recebido['corpo']['generationConfig']
        self.assertNotIn('maxOutputTokens', config)
        self.assertEqual(config['thinkingConfig'], {'thinkingLevel': 'low'})
        self.assertEqual(recebido['timeout'], {'connect': 5.0, 'read': 60, 'write': 60, 'pool': 60})

    def test_timeout_menor_que_conexao(self):
        recebido = {}
        self.gemini(recebido).gerar_estruturado('p', SCHEMA, CONTEXTO, parametros=ParametrosGeracao(timeout_segundos=3))
        self.assertEqual(recebido['timeout']['connect'], 3)

    def test_openai_max_tokens_e_esquema_sem_limites_de_texto(self):
        recebido = {}
        resposta = {'model': 'x', 'choices': [{'message': {'content': '{"ok": "sim"}'}, 'finish_reason': 'stop'}]}
        prov = OpenAICompatProvider(api_key='k', modelos=['m'], url_base='https://o.teste',
                                    transport=self.capturar(recebido, resposta))
        prov.gerar_estruturado('p', SCHEMA, CONTEXTO, parametros=ParametrosGeracao(
            timeout_segundos=9, nivel_raciocinio='high', max_tokens_saida=321))
        self.assertEqual(recebido['corpo']['max_tokens'], 321)
        enviado = recebido['corpo']['response_format']['json_schema']['schema']
        self.assertNotIn('maxLength', json.dumps(enviado))
        self.assertIn('maxLength', json.dumps(SCHEMA))  # original intacto
        self.assertEqual(recebido['timeout']['read'], 9)
