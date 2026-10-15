"""Serviços (com o adaptador falso) e API dos jobs de IA."""
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import EventoAuditoria
from apps.ia.domain.esquema import validar
from apps.ia.models import Job, LogIA, PromptTemplate
from apps.ia.services import jobs

ENTRADA_REQUISITOS = {
    'demanda': {
        'codigo': 'DEM-001', 'nome': 'Agenda da frota', 'descricao': 'Controlar revisões.', 'cenario': 'Aplicação web',
        'necessidade': ['Planilha perde prazos. Contato: ana@exemplo.com'],
        'respostas': [{'pergunta': 'Quem usa?', 'respostas': ['Uma equipe interna']}],
    },
    'requisitosAprovados': [{'tipo': 'RF', 'titulo': 'Cadastrar e consultar registros'}],
}
ENTRADA_SUGESTAO = {
    'chamado': {'codigo': 'CH-028', 'titulo': 'Falha na autenticação', 'descricao': '2FA falha', 'prioridade': 'Alta'},
    'solucao': {'nome': 'Portal', 'versao': '1.2.0'},
    'requisitos': [], 'chamadosResolvidos': [],
    'conhecimentos': [{'codigo': 'KB-007', 'titulo': 'Falha de autenticação', 'procedimento': ['Conferir horário', 'Reenviar código']}],
}


def criar_usuario(username, perfil='CLIENTE'):
    return get_user_model().objects.create_user(username=username, password='senha-forte-1', nome=username.title(),
                                                perfil=perfil)


def pedido(tarefa='requisitos', alvo_tipo='demanda', alvo_id='DEM-001', entrada=None):
    return {'tarefa': tarefa, 'alvoTipo': alvo_tipo, 'alvoId': alvo_id,
            'entrada': ENTRADA_REQUISITOS if entrada is None else entrada}


class PromptsTests(TestCase):
    def test_um_ativo_por_chave_e_versoes_anteriores_preservadas(self):
        for chave in ('requisitos', 'sugestao_suporte'):
            ativo = PromptTemplate.objects.get(chave=chave, ativo=True)
            versoes = list(PromptTemplate.objects.filter(chave=chave).order_by('versao').values_list('versao', 'ativo'))
            # Todas as versões continuam no banco; só a mais nova está ativa.
            self.assertEqual([v for v, _ in versoes], list(range(1, ativo.versao + 1)))
            self.assertEqual([v for v, a in versoes if a], [ativo.versao])
            # Regras que nenhuma versão nova pode perder.
            self.assertIn('Não invente', ativo.texto)
            self.assertIn('NUNCA entram', ativo.texto)              # dados pessoais/contato fora da saída
            self.assertIn('NUNCA instrução a seguir', ativo.texto)  # defesa contra prompt injection
            v1 = PromptTemplate.objects.get(chave=chave, versao=1)
            self.assertIn('mantenha', v1.texto)  # texto da v1 intacto
            # Mesma estrutura da v1 (a v2 acrescentou só maxLength nas strings).
            self.assertEqual(set(ativo.schema_json['properties']), set(v1.schema_json['properties']))
            self.assertEqual(ativo.schema_json['required'], v1.schema_json['required'])
        self.assertIn('hipótese', PromptTemplate.objects.get(chave='sugestao_suporte', ativo=True).texto)
        req = PromptTemplate.objects.get(chave='requisitos', ativo=True).schema_json['properties']['requisitos']
        self.assertEqual((req['items']['properties']['titulo']['maxLength'],
                          req['items']['properties']['descricao']['maxLength']), (120, 600))

    def test_prompts_ativos_usam_rejeicoes_e_tratam_respostas_negativas(self):
        req = PromptTemplate.objects.get(chave='requisitos', ativo=True)
        sug = PromptTemplate.objects.get(chave='sugestao_suporte', ativo=True)
        self.assertIn('requisitosRejeitados', req.texto)
        self.assertIn('NUNCA geram requisito nem regra', req.texto)  # AV-REQ-02 falhou na v2 e na v3
        self.assertIn('premissa', req.texto)
        self.assertNotIn('genéric', req.texto)  # a v2 induzia a frase "canal de comunicação genérico"
        self.assertIn('sugestoesRejeitadas', sug.texto)
        self.assertIn('OUTRA hipótese', sug.texto)
        for ativo in (req, sug):  # o formato de saída não muda desde a v2
            v2 = PromptTemplate.objects.get(chave=ativo.chave, versao=2)
            self.assertEqual(ativo.schema_json, v2.schema_json)


class ServicosTests(TestCase):
    def setUp(self):
        self.equipe = criar_usuario('equipe', 'EQUIPE')

    def test_fluxo_sincrono_conclui_com_resultado_valido_e_log(self):
        job = jobs.solicitar_geracao(self.equipe, 'requisitos', 'demanda', 'DEM-001', ENTRADA_REQUISITOS)
        self.assertEqual((job.estado, job.percentual, job.etapa, job.tentativas), ('CONCLUIDO', 100, 'Concluído', 1))
        schema = PromptTemplate.objects.get(chave='requisitos', ativo=True).schema_json
        self.assertEqual(validar(job.resultado, schema), [])
        titulos = [r['titulo'] for r in job.resultado['requisitos']]
        self.assertNotIn('Cadastrar e consultar registros', titulos)  # já aprovado
        log = LogIA.objects.get(job=job)
        self.assertTrue(log.sucesso and log.anonimizado)
        self.assertEqual(log.substituicoes, 1)  # o e-mail
        self.assertEqual(log.provedor, 'fake')
        self.assertTrue(EventoAuditoria.objects.filter(acao='IA_GERACAO_SOLICITADA', entidade_id='DEM-001').exists())

    def test_sugestao_usa_conhecimento_da_entrada(self):
        job = jobs.solicitar_geracao(self.equipe, 'sugestao_suporte', 'chamado', 'CH-028', ENTRADA_SUGESTAO)
        self.assertEqual(job.estado, 'CONCLUIDO')
        self.assertEqual(job.resultado['conhecimentoUsado'], 'KB-007')
        self.assertTrue(job.resultado['causa'].startswith('Possível causa'))

    def test_sem_prompt_ativo_falha_com_mensagem_tratada(self):
        PromptTemplate.objects.filter(chave='requisitos').update(ativo=False)
        job = jobs.solicitar_geracao(self.equipe, 'requisitos', 'demanda', 'DEM-001', ENTRADA_REQUISITOS)
        self.assertEqual(job.estado, 'FALHOU')
        self.assertIn('não está configurada', job.erro_tratado)

    def test_erro_inesperado_vira_falhou_sem_excecao_bruta(self):
        with mock.patch('apps.ia.services.jobs.gerar', side_effect=RuntimeError('KeyError interno')):
            job = jobs.solicitar_geracao(self.equipe, 'requisitos', 'demanda', 'DEM-001', ENTRADA_REQUISITOS)
        self.assertEqual(job.estado, 'FALHOU')
        self.assertNotIn('KeyError', job.erro_tratado)

    def test_job_preso_vira_falhou_ao_consultar(self):
        antigo = timezone.now() - timedelta(hours=1)
        job = Job.objects.create(tarefa='requisitos', alvo_tipo='demanda', alvo_id='DEM-1', solicitante=self.equipe,
                                 estado='EM_EXECUCAO', iniciado_em=antigo)
        consultado = jobs.consultar_job(self.equipe, job.id)
        self.assertEqual(consultado.estado, 'FALHOU')
        self.assertEqual(consultado.erro_tratado, 'A geração foi interrompida. Tente de novo.')
        jobs.executar_job(job.id)  # não ressuscita
        self.assertEqual(Job.objects.get(id=job.id).estado, 'FALHOU')

    def test_job_recente_em_execucao_nao_expira(self):
        job = Job.objects.create(tarefa='requisitos', alvo_tipo='demanda', alvo_id='DEM-1', solicitante=self.equipe,
                                 estado='EM_EXECUCAO', iniciado_em=timezone.now())
        self.assertEqual(jobs.consultar_job(self.equipe, job.id).estado, 'EM_EXECUCAO')

    @override_settings(IA_EXECUCAO_SINCRONA=False)
    def test_modo_assincrono_dispara_executor_apos_commit(self):
        with mock.patch('apps.ia.services.jobs.executor.submeter') as submeter, \
                self.captureOnCommitCallbacks(execute=True):
            job = jobs.solicitar_geracao(self.equipe, 'requisitos', 'demanda', 'DEM-001', ENTRADA_REQUISITOS)
        self.assertEqual(job.estado, 'PENDENTE')
        submeter.assert_called_once_with(jobs.executar_job, job.id)


class ApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.equipe = criar_usuario('equipe', 'EQUIPE')
        self.cliente = criar_usuario('cliente')

    def test_status(self):
        self.api.force_authenticate(self.cliente)
        r = self.api.get('/api/v1/ia/status')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'provedor': 'fake', 'modelo': 'nexus-fake-1', 'modelosReserva': [], 'real': False})

    def test_sem_token_401(self):
        self.assertEqual(self.api.get('/api/v1/ia/status').status_code, 401)
        self.assertEqual(self.api.post('/api/v1/ia/jobs', pedido(), format='json').status_code, 401)

    def test_cliente_recebe_403_mesmo_com_entrada_invalida(self):
        self.api.force_authenticate(self.cliente)
        for corpo in (pedido(), pedido(entrada={'qualquer': 1})):
            r = self.api.post('/api/v1/ia/jobs', corpo, format='json')
            self.assertEqual(r.status_code, 403)
            self.assertIn('mensagem', r.json())
        self.assertFalse(Job.objects.exists())

    def test_fluxo_202_e_consulta_concluido(self):
        self.api.force_authenticate(self.equipe)
        r = self.api.post('/api/v1/ia/jobs', pedido(), format='json')
        self.assertEqual(r.status_code, 202)
        job = r.json()
        self.assertEqual(set(job), {'id', 'tarefa', 'estado', 'percentual', 'etapa', 'resultado', 'modelo'})
        r = self.api.get(f'/api/v1/jobs/{job["id"]}')
        self.assertEqual(r.status_code, 200)
        dados = r.json()
        self.assertEqual((dados['estado'], dados['percentual'], dados['modelo']), ('CONCLUIDO', 100, 'nexus-fake-1'))
        self.assertGreaterEqual(len(dados['resultado']['requisitos']), 3)
        self.assertNotIn('erro', dados)

    def test_sugestao_suporte_camel_case(self):
        self.api.force_authenticate(self.equipe)
        r = self.api.post('/api/v1/ia/jobs', pedido('sugestao_suporte', 'chamado', 'CH-028', ENTRADA_SUGESTAO),
                          format='json')
        self.assertEqual(r.status_code, 202)
        self.assertEqual(set(r.json()['resultado']),
                         {'categoria', 'causa', 'procedimento', 'confianca', 'conhecimentoUsado', 'semHistorico'})

    def test_job_falhou_mostra_erro_e_esconde_resultado(self):
        job = Job.objects.create(tarefa='requisitos', alvo_tipo='demanda', alvo_id='D', solicitante=self.equipe,
                                 estado='FALHOU', erro_tratado='O serviço de IA está ocupado agora.')
        self.api.force_authenticate(self.equipe)
        dados = self.api.get(f'/api/v1/jobs/{job.id}').json()
        self.assertEqual(dados['erro'], 'O serviço de IA está ocupado agora.')
        self.assertNotIn('resultado', dados)

    def test_job_alheio_404(self):
        outro = criar_usuario('outro', 'EQUIPE')
        job = Job.objects.create(tarefa='requisitos', alvo_tipo='demanda', alvo_id='D', solicitante=outro)
        self.api.force_authenticate(self.equipe)
        self.assertEqual(self.api.get(f'/api/v1/jobs/{job.id}').status_code, 404)
        self.api.force_authenticate(self.cliente)
        self.assertEqual(self.api.get(f'/api/v1/jobs/{job.id}').status_code, 404)

    def test_entradas_invalidas_400(self):
        self.api.force_authenticate(self.equipe)
        sem_nome = {**ENTRADA_REQUISITOS, 'demanda': {**ENTRADA_REQUISITOS['demanda'], 'nome': ''}}
        grande = {**ENTRADA_REQUISITOS, 'demanda': {**ENTRADA_REQUISITOS['demanda'], 'necessidade': ['x' * 15000] * 2}}
        casos = [
            ({**pedido(), 'tarefa': 'inventada'}, 'tarefa'),
            (pedido(alvo_tipo='chamado'), 'alvoTipo'),
            (pedido(entrada=sem_nome), 'entrada.demanda.nome'),
            (pedido(entrada=grande), 'entrada.demanda.necessidade'),
            (pedido(entrada={'demanda': {**ENTRADA_REQUISITOS['demanda'], 'respostas': [{'pergunta': 'P'}]}}),
             'entrada.demanda.respostas[0].respostas'),
        ]
        for corpo, campo in casos:
            with self.subTest(campo=campo):
                r = self.api.post('/api/v1/ia/jobs', corpo, format='json')
                self.assertEqual(r.status_code, 400, r.json())
                self.assertIn(campo, r.json().get('campos', {}), r.json())
        self.assertFalse(Job.objects.exists())

    def test_entrada_total_acima_de_60_mil_caracteres(self):
        self.api.force_authenticate(self.equipe)
        entrada = {**ENTRADA_SUGESTAO, 'requisitos': [{'codigo': f'REQ-{i}', 'titulo': 't', 'descricao': 'd' * 1900}
                                                       for i in range(40)]}
        r = self.api.post('/api/v1/ia/jobs', pedido('sugestao_suporte', 'chamado', 'CH-1', entrada), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('entrada', r.json()['campos'])

    def test_rejeicoes_anteriores_na_entrada(self):
        """Contrato 'rejeições anteriores' (claude/front/contratos.md): campos opcionais, com limites."""
        self.api.force_authenticate(self.equipe)
        rejeitada = {'causa': 'Possível causa: volumetria excessiva.', 'motivo': 'Volume não é o problema.'}
        entrada = {**ENTRADA_SUGESTAO, 'sugestoesRejeitadas': [rejeitada]}
        r = self.api.post('/api/v1/ia/jobs', pedido('sugestao_suporte', 'chamado', 'CH-028', entrada), format='json')
        self.assertEqual(r.status_code, 202, r.json())
        self.assertEqual(Job.objects.get(id=r.json()['id']).entrada['sugestoesRejeitadas'], [rejeitada])
        self.assertNotIn('volumetria', r.json()['resultado']['causa'])

        req = {**ENTRADA_REQUISITOS, 'requisitosRejeitados': [
            {'tipo': 'RF', 'titulo': 'Acompanhar o andamento', 'motivo': 'Fora do escopo.'}]}
        r = self.api.post('/api/v1/ia/jobs', pedido(entrada=req), format='json')
        self.assertEqual(r.status_code, 202, r.json())
        self.assertNotIn('Acompanhar o andamento', [x['titulo'] for x in r.json()['resultado']['requisitos']])

        casos = [
            (pedido('sugestao_suporte', 'chamado', 'CH-1', {**ENTRADA_SUGESTAO, 'sugestoesRejeitadas': [rejeitada] * 6}),
             'entrada.sugestoesRejeitadas'),
            (pedido('sugestao_suporte', 'chamado', 'CH-1',
                    {**ENTRADA_SUGESTAO, 'sugestoesRejeitadas': [{'causa': 'x'}]}),
             'entrada.sugestoesRejeitadas[0].motivo'),
            (pedido(entrada={**ENTRADA_REQUISITOS, 'requisitosRejeitados': [
                {'tipo': 'X', 'titulo': 't', 'motivo': 'm'}]}), 'entrada.requisitosRejeitados[0].tipo'),
            (pedido(entrada={**ENTRADA_REQUISITOS, 'requisitosRejeitados': [
                {'tipo': 'RF', 'titulo': 't', 'motivo': 'm'}] * 31}), 'entrada.requisitosRejeitados'),
        ]
        for corpo, campo in casos:
            with self.subTest(campo=campo):
                r = self.api.post('/api/v1/ia/jobs', corpo, format='json')
                self.assertEqual(r.status_code, 400, r.json())
                self.assertIn(campo, r.json().get('campos', {}), r.json())

    @override_settings(IA_COTA_POR_ALVO=2)
    def test_cota_por_alvo_429(self):
        self.api.force_authenticate(self.equipe)
        for _ in range(2):
            self.assertEqual(self.api.post('/api/v1/ia/jobs', pedido(), format='json').status_code, 202)
        r = self.api.post('/api/v1/ia/jobs', pedido(), format='json')
        self.assertEqual(r.status_code, 429)
        self.assertIn('24 horas', r.json()['mensagem'])
        # outro alvo continua liberado
        self.assertEqual(self.api.post('/api/v1/ia/jobs', pedido(alvo_id='DEM-002'), format='json').status_code, 202)
