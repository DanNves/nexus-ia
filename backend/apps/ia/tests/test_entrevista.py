"""Tarefa `entrevista` (rodadas de perguntas), reaproveitamento de resultado e cotas de uso.

Domínio sem banco; serviço e API com o adaptador falso (settings de teste). Nenhum teste acessa a internet.
"""
import re
from unittest import mock

from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from apps.cenario.domain.sinais import CODIGOS
from apps.core.models import EventoAuditoria
from apps.ia.adapters.fake import FakeProvider
from apps.ia.api.serializers import EntradaEntrevistaSerializer
from apps.ia.avaliacao.casos import casos
from apps.ia.domain.entrevista import (LIMITE_REPETICAO_PERGUNTA, ajustar_entrevista, eh_opcao_da_interface,
                                       pergunta_repetida, similaridade_pergunta, slug)
from apps.ia.domain.esquema import validar
from apps.ia.domain.reuso import hash_entrada
from apps.ia.models import Job, LogIA, PromptTemplate
from apps.ia.services import jobs
from apps.ia.tests.test_servicos_api import ENTRADA_REQUISITOS, criar_usuario, pedido

ENTRADA = {
    'demanda': {'codigo': 'DEM-020', 'nome': 'Estoque da obra', 'descricao': 'Controlar o almoxarifado.',
                'necessidade': ['O almoxarife anota num caderno. Contato: ana@exemplo.com']},
    'respostas': [{'id': 'usuarios', 'pergunta': 'Quem vai usar o sistema no dia a dia?',
                   'respostas': ['Uma equipe interna']}],
    'rodada': 1,
}


def opcao(valor, rotulo, sinais=()):
    return {'valor': valor, 'rotulo': rotulo, 'sinais': list(sinais)}


def pergunta(pid, enunciado, opcoes=None, multipla=False):
    return {'id': pid, 'enunciado': enunciado, 'ajuda': 'Por quê.', 'multipla': multipla,
            'opcoes': opcoes or [opcao('a', 'Opção A'), opcao('b', 'Opção B'), opcao('c', 'Opção C')]}


def saida(*perguntas, suficiente=False):
    return {'perguntas': list(perguntas), 'suficiente': suficiente, 'resumo': ' Resumo. ', 'lacunas': ['x', 'x', ' ']}


# ---------------- domínio ----------------

class SimilaridadePerguntaTests(SimpleTestCase):
    """Calibração de LIMITE_REPETICAO_PERGUNTA (0,6) com pares reais de perguntas."""

    REPETIDAS = (
        ('Precisa funcionar sem internet?', 'O sistema precisa funcionar sem internet?'),
        ('Quem vai usar o sistema no dia a dia?', 'Quem vai usar o sistema?'),
        ('Com que frequência a tarefa acontece?', 'Com que frequência essa tarefa acontece hoje?'),
        ('Quantas pessoas usariam ao mesmo tempo, mais ou menos?', 'Quantas pessoas vão usar ao mesmo tempo?'),
    )
    DIFERENTES = (
        ('Precisa funcionar sem internet?', 'Nos lugares onde o trabalho acontece, a conexão costuma cair?'),
        ('Precisa funcionar sem internet?', 'Precisa funcionar sem energia?'),
        ('Quem vai usar o sistema no dia a dia?', 'Quem vai aprovar os pedidos?'),
        ('Quem vai usar o sistema no dia a dia?', 'Onde as pessoas vão usar?'),
        ('Vai precisar imprimir etiquetas?', 'Vai precisar ler código de barras?'),
        ('Quantas pessoas trabalham na equipe?', 'Quantas pessoas usariam ao mesmo tempo?'),
    )

    def test_pega_repeticao_e_deixa_passar_pergunta_diferente(self):
        for a, b in self.REPETIDAS:
            with self.subTest(a=a, b=b):
                self.assertGreaterEqual(similaridade_pergunta(a, b), LIMITE_REPETICAO_PERGUNTA)
        for a, b in self.DIFERENTES:
            with self.subTest(a=a, b=b):
                self.assertLess(similaridade_pergunta(a, b), LIMITE_REPETICAO_PERGUNTA)
        self.assertEqual(pergunta_repetida('Precisa funcionar SEM internet', ['Outra coisa', 'Precisa funcionar sem internet?']),
                         'Precisa funcionar sem internet?')
        self.assertIsNone(pergunta_repetida('Precisa funcionar sem internet?', ['', None]))

    def test_opcoes_da_interface(self):
        for rotulo in ('Outro', 'Outra: qual?', 'Não sei', 'não tenho certeza', 'Nenhuma das anteriores'):
            self.assertTrue(eh_opcao_da_interface({'valor': 'x', 'rotulo': rotulo}), rotulo)
        self.assertTrue(eh_opcao_da_interface({'valor': 'nao_sei', 'rotulo': 'Prefiro ver depois'}))
        for rotulo in ('Outro sistema que já usamos', 'Outra equipe da empresa', 'Não, sempre haverá internet'):
            self.assertFalse(eh_opcao_da_interface({'valor': 'x', 'rotulo': rotulo}), rotulo)

    def test_slug(self):
        self.assertEqual(slug('Quem Aprova? (gestão)', 'p'), 'quem_aprova_gestao')
        self.assertEqual(slug('!!!', 'pergunta'), 'pergunta')
        self.assertLessEqual(len(slug('x' * 100, 'p')), 40)


class AjustarEntrevistaTests(SimpleTestCase):
    def test_remove_repetida_outro_nao_sei_e_sinais_fora_do_catalogo(self):
        bruta = saida(
            pergunta('quem', 'Quem vai usar o sistema?'),  # já respondida (similaridade)
            pergunta('internet', 'Precisa funcionar sem internet?', [
                opcao('sim', 'Sim, sempre', ['PRECISA_OFFLINE', 'INVENTADO', 'PRECISA_OFFLINE']),
                opcao('as_vezes', 'Às vezes cai', ['INTERNET_INSTAVEL']),
                opcao('nao', 'Não', ['INTERNET_DISPONIVEL']),
                opcao('outro', 'Outro'), opcao('nao_sei', 'Não sei')]),
        )
        dados = ajustar_entrevista(ENTRADA, bruta)
        self.assertEqual([p['id'] for p in dados['perguntas']], ['internet'])
        opcoes = dados['perguntas'][0]['opcoes']
        self.assertEqual([o['valor'] for o in opcoes], ['sim', 'as_vezes', 'nao'])
        self.assertEqual(opcoes[0]['sinais'], ['PRECISA_OFFLINE'])
        self.assertEqual((dados['resumo'], dados['lacunas']), ('Resumo.', ['x']))
        self.assertFalse(dados['suficiente'])
        self.assertEqual(len(bruta['perguntas']), 2)  # não altera a saída bruta (a avaliação mede o modelo)

    def test_ids_e_valores_unicos_sem_colidir_com_respondidas(self):
        bruta = saida(
            pergunta('usuarios', 'Quantas pessoas trabalham na equipe?'),       # id já respondido
            pergunta('Frequência!', 'Com que frequência a tarefa acontece?', [
                opcao('Diário', 'Todo dia'), opcao('diario', 'Uma vez por semana'), opcao('', 'Uma vez por mês'),
                opcao('x', 'todo dia')]),                                            # rótulo repetido sai
            pergunta('usuarios', 'Quem aprova os pedidos?'),
        )
        dados = ajustar_entrevista(ENTRADA, bruta)
        self.assertEqual([p['id'] for p in dados['perguntas']], ['usuarios_2', 'frequencia', 'usuarios_3'])
        self.assertEqual([o['valor'] for o in dados['perguntas'][1]['opcoes']], ['diario', 'diario_2', 'uma_vez_por_mes'])

    def test_pergunta_com_menos_de_tres_opcoes_sai_e_parecida_na_mesma_rodada_sai(self):
        bruta = saida(
            pergunta('a', 'Vai imprimir etiquetas?', [opcao('s', 'Sim'), opcao('n', 'Não'), opcao('o', 'Outro')]),
            pergunta('b', 'Precisa funcionar sem internet?'),
            pergunta('c', 'O sistema precisa funcionar sem internet?'),
        )
        dados = ajustar_entrevista(ENTRADA, bruta)
        self.assertEqual([p['id'] for p in dados['perguntas']], ['b'])

    def test_suficiente_forcado_na_ultima_rodada_ou_sem_perguntas(self):
        com_pergunta = saida(pergunta('b', 'Precisa funcionar sem internet?'))
        ultima = {**ENTRADA, 'rodada': 3, 'rodadaMaxima': 3}
        dados = ajustar_entrevista(ultima, com_pergunta)
        self.assertTrue(dados['suficiente'])
        self.assertEqual(len(dados['perguntas']), 1)  # as perguntas da última rodada continuam
        self.assertTrue(ajustar_entrevista({**ENTRADA, 'rodadaMaxima': 3},
                                           saida(pergunta('q', 'Quem vai usar o sistema?')))['suficiente'])
        self.assertFalse(ajustar_entrevista({**ENTRADA, 'rodadaMaxima': 3}, com_pergunta)['suficiente'])


class ReusoTests(SimpleTestCase):
    def test_hash_estavel_e_sensivel_ao_conteudo_e_ao_prompt(self):
        a = {'demanda': {'nome': 'X', 'codigo': 'D'}, 'rodada': 1, 'respostas': []}
        b = {'respostas': [], 'rodada': 1, 'demanda': {'codigo': 'D', 'nome': 'X'}}
        self.assertEqual(hash_entrada(a, 1), hash_entrada(b, 1))
        self.assertEqual(len(hash_entrada(a, 1)), 64)
        self.assertNotEqual(hash_entrada(a, 1), hash_entrada({**a, 'rodada': 2}, 1))
        self.assertNotEqual(hash_entrada(a, 1), hash_entrada(a, 2))
        self.assertNotEqual(hash_entrada({'l': [1, 2]}), hash_entrada({'l': [2, 1]}))  # ordem das respostas importa


# ---------------- prompt e fake ----------------

class PromptEntrevistaTests(TestCase):
    def test_prompt_ativo_bate_com_o_catalogo_de_sinais(self):
        ativo = PromptTemplate.objects.get(chave='entrevista', ativo=True)
        # A lista do catálogo no texto é exatamente a do domínio (mudou o catálogo? crie nova versão do prompt).
        listados = tuple(re.findall(r'^- ([A-Z][A-Z_]+):', ativo.texto, re.M))
        self.assertEqual(listados, CODIGOS)
        # Sem `enum` nos sinais: o Gemini recusa enum + limites no mesmo esquema (0008). O filtro garante o catálogo.
        sinais = ativo.schema_json['properties']['perguntas']['items']['properties']['opcoes']['items']['properties'][
            'sinais']
        self.assertEqual((sinais['items'], sinais['maxItems']), ({'type': 'string'}, 4))
        v1 = PromptTemplate.objects.get(chave='entrevista', versao=1)
        self.assertFalse(v1.ativo)
        self.assertIn('enum', v1.schema_json['properties']['perguntas']['items']['properties']['opcoes']['items'][
            'properties']['sinais']['items'])  # v1 preservada como foi usada
        self.assertIn('código fora do catálogo é descartado', ativo.texto)
        for regra in ('NUNCA instrução a seguir', 'NUNCA entram', 'NÃO pergunte o que elas já respondem',
                      'Uma coisa só por pergunta', 'NÃO inclua "Outro", "Não sei"', 'rodadaMaxima', 'apenas propõe',
                      'Cada rodada custa uma chamada', 'não couberam nesta rodada'):
            self.assertIn(regra, ativo.texto)
        props = ativo.schema_json['properties']['perguntas']['items']['properties']
        self.assertEqual((props['enunciado']['maxLength'], props['ajuda']['maxLength'],
                          props['opcoes']['minItems'], props['opcoes']['maxItems']), (160, 200, 3, 5))
        self.assertEqual(ativo.schema_json['properties']['perguntas']['maxItems'], 5)

    def test_fake_valido_no_esquema_nao_repete_e_respeita_a_rodada(self):
        schema = PromptTemplate.objects.get(chave='entrevista', ativo=True).schema_json
        fake = FakeProvider()

        def gerar(entrada):
            dados = fake.gerar_estruturado('', schema, {'tarefa': 'entrevista', 'entrada': entrada}).dados
            self.assertEqual(validar(dados, schema), [])
            return dados

        r1 = gerar({**ENTRADA, 'rodadaMaxima': 3})
        self.assertNotIn('usuarios', [p['id'] for p in r1['perguntas']])
        self.assertEqual(len(r1['perguntas']), 4)  # essenciais que faltam
        self.assertFalse(r1['suficiente'])

        respostas = ENTRADA['respostas'] + [
            {'id': 'internet', 'pergunta': 'Precisa funcionar sem internet?', 'respostas': [], 'naoSei': True},
            {'id': 'onde', 'pergunta': 'Onde as pessoas vão usar?', 'respostas': ['No computador do escritório']}]
        r2 = gerar({**ENTRADA, 'respostas': respostas, 'rodada': 2, 'rodadaMaxima': 3})
        ids = [p['id'] for p in r2['perguntas']]
        self.assertEqual(ids[0], 'internet_detalhe')                     # aprofunda o "Não sei"
        self.assertIn('perifericos', ids)                                # só aparece com USO_COMPUTADOR
        self.assertFalse({'usuarios', 'onde', 'internet'} & set(ids))

        r3 = gerar({**ENTRADA, 'respostas': respostas, 'rodada': 3, 'rodadaMaxima': 3})
        self.assertLessEqual(len(r3['perguntas']), 2)
        self.assertTrue(r3['suficiente'])

    def test_casos_de_avaliacao_passam_pelo_serializer(self):
        for caso in casos('entrevista'):
            with self.subTest(caso=caso.id):
                s = EntradaEntrevistaSerializer(data=caso.entrada)
                self.assertTrue(s.is_valid(), s.errors)
                self.assertEqual(s.validated_data['rodadaMaxima'], caso.entrada['rodadaMaxima'])


# ---------------- serviço e API ----------------

def pedido_entrevista(entrada=None, alvo_id='DEM-020'):
    return pedido('entrevista', 'demanda', alvo_id, ENTRADA if entrada is None else entrada)


class EntrevistaApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.cliente = criar_usuario('cliente')
        self.api.force_authenticate(self.cliente)

    def test_cliente_pede_entrevista_mas_continua_403_em_requisitos(self):
        r = self.api.post('/api/v1/ia/jobs', pedido_entrevista(), format='json')
        self.assertEqual(r.status_code, 202, r.json())
        dados = r.json()
        self.assertEqual((dados['tarefa'], dados['estado']), ('entrevista', 'CONCLUIDO'))
        self.assertNotIn('reaproveitado', dados)
        schema = PromptTemplate.objects.get(chave='entrevista', ativo=True).schema_json
        self.assertEqual(validar(dados['resultado'], schema), [])
        self.assertTrue(LogIA.objects.get(job_id=dados['id']).anonimizado)
        job = Job.objects.get(id=dados['id'])
        self.assertEqual(job.entrada['rodadaMaxima'], 3)
        self.assertEqual(len(job.entrada_hash), 64)

        self.assertEqual(self.api.post('/api/v1/ia/jobs', pedido(), format='json').status_code, 403)

    def test_rodada_maxima_vem_do_servidor(self):
        r = self.api.post('/api/v1/ia/jobs', pedido_entrevista({**ENTRADA, 'rodadaMaxima': 99}), format='json')
        self.assertEqual(r.status_code, 202)
        self.assertEqual(Job.objects.get(id=r.json()['id']).entrada['rodadaMaxima'], 3)

    def test_entradas_invalidas_400_com_caminho_completo(self):
        resposta = ENTRADA['respostas'][0]
        casos_ = [
            ({**ENTRADA, 'rodada': 4}, 'entrada.rodada'),
            ({**ENTRADA, 'rodada': 0}, 'entrada.rodada'),
            ({k: v for k, v in ENTRADA.items() if k != 'rodada'}, 'entrada.rodada'),
            ({**ENTRADA, 'respostas': [resposta] * 41}, 'entrada.respostas'),
            ({**ENTRADA, 'respostas': [{**resposta, 'pergunta': 'p' * 301}]}, 'entrada.respostas[0].pergunta'),
            ({**ENTRADA, 'respostas': [{**resposta, 'respostas': ['x'] * 11}]}, 'entrada.respostas[0].respostas'),
            ({**ENTRADA, 'respostas': [{**resposta, 'naoSei': 'talvez'}]}, 'entrada.respostas[0].naoSei'),
            ({**ENTRADA, 'demanda': {**ENTRADA['demanda'], 'necessidade': ['x' * 15000] * 2}},
             'entrada.demanda.necessidade'),
        ]
        for entrada, campo in casos_:
            with self.subTest(campo=campo):
                r = self.api.post('/api/v1/ia/jobs', pedido_entrevista(entrada), format='json')
                self.assertEqual(r.status_code, 400, r.json())
                self.assertIn(campo, r.json().get('campos', {}), r.json())
        self.assertFalse(Job.objects.exists())

    @override_settings(IA_ENTREVISTA_MAX_RODADAS=2)
    def test_maximo_de_rodadas_configuravel(self):
        r = self.api.post('/api/v1/ia/jobs', pedido_entrevista({**ENTRADA, 'rodada': 3}), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('no máximo 2 rodadas', r.json()['campos']['entrada.rodada'][0])

    def test_status_mostra_a_cota_do_usuario(self):
        self.api.post('/api/v1/ia/jobs', pedido_entrevista(), format='json')
        self.api.post('/api/v1/ia/jobs', pedido_entrevista(), format='json')  # reaproveitado: não conta
        cota = self.api.get('/api/v1/ia/status').json()['cota']
        self.assertEqual(cota, {'usadasHoje': 1, 'limiteDiario': 40, 'entrevistaMaxRodadas': 3})


class ReaproveitamentoTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.cliente = criar_usuario('cliente')
        self.api.force_authenticate(self.cliente)

    def _post(self, entrada=None, alvo_id='DEM-020'):
        return self.api.post('/api/v1/ia/jobs', pedido_entrevista(entrada, alvo_id), format='json')

    def test_mesma_entrada_devolve_o_mesmo_job_sem_chamar_o_modelo(self):
        primeiro = self._post().json()
        reordenada = {'rodada': 1, 'respostas': ENTRADA['respostas'], 'demanda': ENTRADA['demanda']}
        with mock.patch('apps.ia.services.jobs.gerar') as gerar:
            r = self._post(reordenada)
        gerar.assert_not_called()
        self.assertEqual(r.status_code, 202)
        self.assertEqual((r.json()['id'], r.json()['estado'], r.json()['reaproveitado']), (primeiro['id'], 'CONCLUIDO', True))
        self.assertEqual(r.json()['resultado'], primeiro['resultado'])
        self.assertEqual((Job.objects.count(), LogIA.objects.count()), (1, 1))
        self.assertTrue(EventoAuditoria.objects.filter(acao='IA_RESULTADO_REAPROVEITADO').exists())
        # a consulta do job continua normal (sem a marca, que é só da resposta do POST)
        self.assertNotIn('reaproveitado', self.api.get(f'/api/v1/jobs/{primeiro["id"]}').json())

    @override_settings(IA_COTA_DIARIA_POR_USUARIO=1)
    def test_reaproveitado_funciona_mesmo_com_a_cota_esgotada(self):
        primeiro = self._post().json()
        self.assertEqual(self._post().json()['id'], primeiro['id'])
        r = self._post({**ENTRADA, 'rodada': 2})
        self.assertEqual((r.status_code, r.json()['codigo']), (429, 'IA_COTA_DIARIA'))

    def test_entrada_diferente_outro_usuario_ou_outro_alvo_geram_job_novo(self):
        primeiro = self._post().json()['id']
        self.assertNotEqual(self._post({**ENTRADA, 'rodada': 2}).json()['id'], primeiro)
        self.assertNotEqual(self._post(alvo_id='DEM-021').json()['id'], primeiro)
        self.api.force_authenticate(criar_usuario('outro'))
        self.assertNotEqual(self._post().json()['id'], primeiro)
        self.assertEqual(Job.objects.count(), 4)

    def test_falhou_nao_e_reaproveitado_e_em_andamento_e(self):
        primeiro = Job.objects.get(id=self._post().json()['id'])
        Job.objects.filter(id=primeiro.id).update(estado=Job.Estado.FALHOU)
        segundo = self._post().json()
        self.assertNotEqual(segundo['id'], str(primeiro.id))
        Job.objects.filter(id=segundo['id']).update(estado=Job.Estado.EM_EXECUCAO)
        r = self._post().json()
        self.assertEqual((r['id'], r['estado'], r['reaproveitado']), (segundo['id'], 'EM_EXECUCAO', True))

    def test_nova_versao_do_prompt_invalida_o_reaproveitamento(self):
        primeiro = self._post().json()['id']
        atual = PromptTemplate.objects.get(chave='entrevista', ativo=True)
        PromptTemplate.objects.filter(id=atual.id).update(ativo=False)
        PromptTemplate.objects.create(chave='entrevista', versao=atual.versao + 1, texto=atual.texto,
                                      schema_json=atual.schema_json, ativo=True)
        self.assertNotEqual(self._post().json()['id'], primeiro)

    def test_requisitos_nao_reaproveita(self):
        """'Gerar de novo' com a mesma entrada é intencional na equipe: sempre gera."""
        self.api.force_authenticate(criar_usuario('equipe', 'EQUIPE'))
        ids = {self.api.post('/api/v1/ia/jobs', pedido(entrada=ENTRADA_REQUISITOS), format='json').json()['id']
               for _ in range(2)}
        self.assertEqual(len(ids), 2)


class CotasTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.cliente = criar_usuario('cliente')
        self.api.force_authenticate(self.cliente)

    def _rodada(self, n, alvo_id='DEM-020'):
        return self.api.post('/api/v1/ia/jobs', pedido_entrevista({**ENTRADA, 'rodada': n}, alvo_id), format='json')

    @override_settings(IA_COTA_DIARIA_POR_USUARIO=2)
    def test_cota_diaria_por_usuario_429_com_codigo(self):
        self.assertEqual([self._rodada(1).status_code, self._rodada(2).status_code], [202, 202])
        r = self._rodada(3)
        self.assertEqual(r.status_code, 429)
        self.assertEqual(r.json()['codigo'], 'IA_COTA_DIARIA')
        self.assertIn('2 gerações', r.json()['mensagem'])
        self.assertEqual(Job.objects.count(), 2)
        # vale para todas as tarefas e é por usuário
        equipe = criar_usuario('equipe', 'EQUIPE')
        self.api.force_authenticate(equipe)
        self.assertEqual(self.api.post('/api/v1/ia/jobs', pedido(), format='json').status_code, 202)

    def test_rodadas_por_demanda_429_com_codigo(self):
        # máx. 3 rodadas + 1 nova tentativa = 4 jobs de entrevista por demanda em 24 h
        for n in (1, 2, 3):
            self.assertEqual(self._rodada(n).status_code, 202)
        nova_tentativa = {**ENTRADA, 'rodada': 3, 'respostas': []}
        self.assertEqual(self.api.post('/api/v1/ia/jobs', pedido_entrevista(nova_tentativa), format='json').status_code,
                         202)
        r = self.api.post('/api/v1/ia/jobs', pedido_entrevista({**ENTRADA, 'rodada': 2, 'respostas': []}), format='json')
        self.assertEqual((r.status_code, r.json()['codigo']), (429, 'IA_RODADAS_ESGOTADAS'))
        self.assertIn('perguntas padrão', r.json()['mensagem'])
        # outra demanda continua liberada; o mesmo pedido já feito continua sendo reaproveitado
        self.assertEqual(self._rodada(1, 'DEM-021').status_code, 202)
        self.assertEqual(self._rodada(1).status_code, 202)

    def test_rodadas_contam_jobs_de_qualquer_usuario_no_mesmo_alvo(self):
        for n in (1, 2):
            self._rodada(n)
        self.api.force_authenticate(criar_usuario('outro'))
        for n in (1, 2):
            self.assertEqual(self._rodada(n).status_code, 202)
        self.assertEqual(self._rodada(3).json()['codigo'], 'IA_RODADAS_ESGOTADAS')

    @override_settings(IA_COTA_POR_ALVO=1)
    def test_cota_do_alvo_tem_codigo_proprio(self):
        self._rodada(1)
        r = self._rodada(2)
        self.assertEqual((r.status_code, r.json()['codigo']), (429, 'IA_COTA_ALVO'))

    def test_servico_ignora_cota_quando_reaproveita(self):
        job = jobs.solicitar_geracao(self.cliente, 'entrevista', 'demanda', 'DEM-9', {**ENTRADA, 'rodadaMaxima': 3})
        with override_settings(IA_COTA_DIARIA_POR_USUARIO=0):
            mesmo = jobs.solicitar_geracao(self.cliente, 'entrevista', 'demanda', 'DEM-9', {**ENTRADA, 'rodadaMaxima': 3})
        self.assertEqual(mesmo.id, job.id)
        self.assertTrue(mesmo.reaproveitado)
