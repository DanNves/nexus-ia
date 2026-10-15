"""Adaptadores Gemini e OpenAI-compatível com httpx.MockTransport (nenhum teste acessa a internet)."""
import json

import httpx
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase

from apps.ia.adapters import PROVEDORES, criar_provedor
from apps.ia.adapters.fake import FakeProvider
from apps.ia.adapters.gemini import GeminiProvider
from apps.ia.adapters.openai_compat import OpenAICompatProvider
from apps.ia.domain.ports import ErroProvedor
from apps.ia.domain.tarefas import TAREFAS
from apps.ia.models import LogIA
from apps.ia.services.geracao import FalhaGeracao, gerar

CHAVE = 'AQ.chave-secreta-de-teste-123'
SCHEMA = {'type': 'object', 'properties': {'ok': {'type': 'boolean'}}, 'required': ['ok'], 'additionalProperties': False}
CONTEXTO = {'tarefa': 'x', 'entrada': {'a': 1}}
SUGESTAO_OK = {'categoria': 'Autenticação', 'causa': 'Possível causa: relógio do servidor.',
               'procedimento': ['Conferir o horário', 'Reenviar o código'], 'confianca': 0.7,
               'conhecimentoUsado': None, 'semHistorico': True}
ENTRADA_SUGESTAO = {'chamado': {'codigo': 'CH-1', 'titulo': 'Erro', 'descricao': 'Falha ao entrar', 'prioridade': 'Alta'},
                    'requisitos': [], 'conhecimentos': [], 'chamadosResolvidos': []}


def resposta_gemini(dados, modelo='gemini-x'):
    return {
        'candidates': [{'content': {'parts': [
            {'text': 'pensando...', 'thought': True},
            {'text': json.dumps(dados), 'thoughtSignature': 'abc'},
        ]}, 'finishReason': 'STOP'}],
        'usageMetadata': {'promptTokenCount': 120, 'candidatesTokenCount': 40, 'thoughtsTokenCount': 15,
                          'totalTokenCount': 175},
        'modelVersion': modelo,
    }


def gemini(handler, modelos=('principal', 'reserva')):
    return GeminiProvider(api_key=CHAVE, modelos=modelos, url_base='https://gemini.teste/v1beta',
                          transport=httpx.MockTransport(handler))


def openai(handler, formato='json_schema', chave=CHAVE):
    return OpenAICompatProvider(api_key=chave, modelos=['modelo-a'], url_base='https://openai.teste/v1',
                                formato=formato, transport=httpx.MockTransport(handler))


def modelo_da_url(request) -> str:
    return request.url.path.rsplit('/', 1)[-1].split(':')[0]


class GeminiTests(SimpleTestCase):
    def test_sucesso_monta_corpo_e_le_tokens(self):
        recebido = {}

        def handler(request):
            recebido['url'] = str(request.url)
            recebido['chave'] = request.headers.get('x-goog-api-key')
            recebido['corpo'] = json.loads(request.content)
            return httpx.Response(200, json=resposta_gemini({'ok': True}))

        r = gemini(handler).gerar_estruturado('instruções', SCHEMA, CONTEXTO)
        self.assertEqual(r.dados, {'ok': True})
        self.assertEqual((r.tokens_entrada, r.tokens_saida, r.tokens_raciocinio), (120, 40, 15))
        self.assertEqual(r.modelo, 'gemini-x')
        self.assertEqual(recebido['url'], 'https://gemini.teste/v1beta/models/principal:generateContent')
        self.assertNotIn(CHAVE, recebido['url'])
        self.assertEqual(recebido['chave'], CHAVE)
        config = recebido['corpo']['generationConfig']
        self.assertEqual(config['responseJsonSchema'], SCHEMA)
        self.assertEqual(config['responseMimeType'], 'application/json')
        self.assertEqual(config['thinkingConfig'], {'thinkingLevel': 'low'})
        self.assertEqual(recebido['corpo']['systemInstruction']['parts'][0]['text'], 'instruções')

    def test_classificacao_de_erros(self):
        casos = [(503, True, 'indisponivel'), (429, True, 'cota'), (404, True, 'modelo_indisponivel'),
                 (400, False, 'requisicao_invalida'), (401, False, 'credencial'), (403, False, 'credencial')]
        for status, temporario, codigo in casos:
            with self.subTest(status=status):
                # O provedor "ecoa" a chave no corpo: ela nunca pode aparecer na mensagem nem no detalhe.
                prov = gemini(lambda req, s=status: httpx.Response(s, json={'error': {'message': f'key {CHAVE}'}}))
                with self.assertRaises(ErroProvedor) as ctx:
                    prov.gerar_estruturado('p', SCHEMA, CONTEXTO)
                erro = ctx.exception
                self.assertEqual((erro.temporario, erro.codigo), (temporario, codigo))
                for texto in (str(erro), erro.mensagem, erro.detalhe, repr(erro)):
                    self.assertNotIn(CHAVE, texto)

    def test_json_invalido_timeout_e_bloqueio(self):
        texto_ruim = {'candidates': [{'content': {'parts': [{'text': '{"ok": tr'}]}, 'finishReason': 'MAX_TOKENS'}]}
        with self.assertRaises(ErroProvedor) as ctx:
            gemini(lambda r: httpx.Response(200, json=texto_ruim)).gerar_estruturado('p', SCHEMA, CONTEXTO)
        self.assertEqual((ctx.exception.codigo, ctx.exception.temporario), ('resposta_invalida', True))

        def lento(request):
            raise httpx.ReadTimeout('lento', request=request)
        with self.assertRaises(ErroProvedor) as ctx:
            gemini(lento).gerar_estruturado('p', SCHEMA, CONTEXTO)
        self.assertEqual(ctx.exception.codigo, 'timeout')

        bloqueado = {'promptFeedback': {'blockReason': 'SAFETY'}}
        with self.assertRaises(ErroProvedor) as ctx:
            gemini(lambda r: httpx.Response(200, json=bloqueado)).gerar_estruturado('p', SCHEMA, CONTEXTO)
        self.assertEqual((ctx.exception.codigo, ctx.exception.temporario), ('bloqueado', False))

    def test_sem_chave_falha_definitiva(self):
        prov = GeminiProvider(api_key='', modelos=['m'], url_base='https://x', transport=httpx.MockTransport(
            lambda r: httpx.Response(200, json={})))
        with self.assertRaises(ErroProvedor) as ctx:
            prov.gerar_estruturado('p', SCHEMA, CONTEXTO)
        self.assertEqual(ctx.exception.codigo, 'credencial')

    def test_embedding(self):
        prov = gemini(lambda r: httpx.Response(200, json={'embedding': {'values': [0.1, 0.2]}}))
        self.assertEqual(prov.embedding('texto'), [0.1, 0.2])


class OpenAICompatTests(SimpleTestCase):
    def resposta(self, conteudo):
        return {'model': 'modelo-a-2026', 'choices': [{'message': {'content': conteudo}, 'finish_reason': 'stop'}],
                'usage': {'prompt_tokens': 50, 'completion_tokens': 10, 'completion_tokens_details': {'reasoning_tokens': 3}}}

    def test_json_schema_estrito(self):
        recebido = {}

        def handler(request):
            recebido['auth'] = request.headers.get('authorization')
            recebido['corpo'] = json.loads(request.content)
            recebido['url'] = str(request.url)
            return httpx.Response(200, json=self.resposta('{"ok": true}'))

        r = openai(handler).gerar_estruturado('instr', SCHEMA, CONTEXTO)
        self.assertEqual(r.dados, {'ok': True})
        self.assertEqual((r.modelo, r.tokens_entrada, r.tokens_saida, r.tokens_raciocinio), ('modelo-a-2026', 50, 10, 3))
        self.assertEqual(recebido['url'], 'https://openai.teste/v1/chat/completions')
        self.assertEqual(recebido['auth'], f'Bearer {CHAVE}')
        formato = recebido['corpo']['response_format']
        self.assertEqual(formato['type'], 'json_schema')
        self.assertTrue(formato['json_schema']['strict'])
        self.assertEqual(formato['json_schema']['schema'], SCHEMA)

    def test_json_object_poe_esquema_nas_instrucoes_e_aceita_cerca(self):
        recebido = {}

        def handler(request):
            recebido['corpo'] = json.loads(request.content)
            return httpx.Response(200, json=self.resposta('```json\n{"ok": false}\n```'))

        r = openai(handler, formato='json_object', chave='').gerar_estruturado('instr', SCHEMA, CONTEXTO)
        self.assertEqual(r.dados, {'ok': False})
        self.assertEqual(recebido['corpo']['response_format'], {'type': 'json_object'})
        self.assertIn('"additionalProperties": false', recebido['corpo']['messages'][0]['content'])

    def test_erros_e_chave_protegida(self):
        for status, codigo in ((503, 'indisponivel'), (404, 'modelo_indisponivel'), (400, 'requisicao_invalida')):
            with self.subTest(status=status):
                with self.assertRaises(ErroProvedor) as ctx:
                    openai(lambda r, s=status: httpx.Response(s, text=f'Incorrect API key {CHAVE}')).gerar_estruturado(
                        'p', SCHEMA, CONTEXTO)
                self.assertEqual(ctx.exception.codigo, codigo)
                self.assertNotIn(CHAVE, ctx.exception.mensagem + ctx.exception.detalhe)

    def test_recusa_vira_bloqueado(self):
        corpo = {'choices': [{'message': {'content': None, 'refusal': 'não posso'}, 'finish_reason': 'stop'}]}
        with self.assertRaises(ErroProvedor) as ctx:
            openai(lambda r: httpx.Response(200, json=corpo)).gerar_estruturado('p', SCHEMA, CONTEXTO)
        self.assertEqual(ctx.exception.codigo, 'bloqueado')


class RegistroTests(SimpleTestCase):
    def test_registro_e_fabrica(self):
        self.assertEqual(set(PROVEDORES), {'gemini', 'openai_compat', 'fake'})
        self.assertIsInstance(criar_provedor(), FakeProvider)  # settings de teste
        with self.assertRaises(ValueError):
            criar_provedor('nao-existe')


class CadeiaDeReservaTests(TestCase):
    """O serviço percorre a cadeia do adaptador e grava um LogIA por tentativa."""

    def setUp(self):
        get_user_model().objects.create_user(username='mari', password='x', nome='Mariana Souza')

    def test_503_e_404_passam_para_a_reserva(self):
        chamados = []

        def handler(request):
            modelo = modelo_da_url(request)
            chamados.append(modelo)
            enviado = request.content.decode()
            self.assertNotIn('Mariana Souza', enviado)  # anonimizado antes do envio
            self.assertNotIn('mari@x.com', enviado)
            if modelo == 'principal':
                return httpx.Response(503, json={'error': {'message': 'high demand'}})
            if modelo == 'antigo':
                return httpx.Response(404, json={'error': {'message': 'no longer available'}})
            dados = {**SUGESTAO_OK, 'causa': 'Possível causa: [PESSOA_1] sem permissão.'}
            return httpx.Response(200, json=resposta_gemini(dados, modelo='reserva-001'))

        entrada = {**ENTRADA_SUGESTAO, 'chamado': {**ENTRADA_SUGESTAO['chamado'],
                                                   'descricao': 'Mariana Souza (mari@x.com) não entra'}}
        geracao = gerar(TAREFAS['sugestao_suporte'], entrada, provedor=gemini(handler, ('principal', 'antigo', 'reserva')))
        self.assertEqual(chamados, ['principal', 'antigo', 'reserva'])
        self.assertEqual(geracao.tentativas, 3)
        self.assertEqual(geracao.dados['causa'], 'Possível causa: Mariana Souza sem permissão.')  # restaurado
        logs = list(LogIA.objects.order_by('criado_em', 'id').values_list('modelo', 'sucesso', 'anonimizado'))
        self.assertEqual(len(logs), 3)
        self.assertEqual(sorted(logs), sorted([('principal', False, True), ('antigo', False, True), ('reserva-001', True, True)]))
        self.assertTrue(LogIA.objects.filter(sucesso=False, erro__startswith='indisponivel').exists())

    def test_400_e_definitivo_nao_tenta_reserva(self):
        chamados = []

        def handler(request):
            chamados.append(modelo_da_url(request))
            return httpx.Response(400, json={'error': {'message': f'bad {CHAVE}'}})

        with self.assertRaises(FalhaGeracao) as ctx:
            gerar(TAREFAS['sugestao_suporte'], ENTRADA_SUGESTAO, provedor=gemini(handler))
        self.assertEqual(chamados, ['principal'])
        self.assertNotIn(CHAVE, ctx.exception.mensagem)
        self.assertFalse(LogIA.objects.filter(erro__contains=CHAVE).exists())

    def test_json_fora_do_esquema_falha_depois_da_cadeia(self):
        def handler(request):
            return httpx.Response(200, json=resposta_gemini({'categoria': 'X'}))  # faltam campos

        with self.assertRaises(FalhaGeracao) as ctx:
            gerar(TAREFAS['sugestao_suporte'], ENTRADA_SUGESTAO, provedor=gemini(handler))
        self.assertEqual(ctx.exception.tentativas, 2)
        self.assertIn('fora do formato', ctx.exception.mensagem)
        self.assertEqual(LogIA.objects.filter(sucesso=False, erro__startswith='fora_do_esquema').count(), 2)
