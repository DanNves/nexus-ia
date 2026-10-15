"""Cobertura acrescentada pelo QA (2026-10-15): limite por usuário do POST de geração e id de job inválido.

Usa só o adaptador falso (settings de teste); nenhum teste chama o provedor real.
"""
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from apps.ia.models import Job
from apps.ia.tests.test_servicos_api import criar_usuario, pedido


class LimitePorUsuarioTests(TestCase):
    """`ia` = 10/min por usuário (contrato de 2026-10-15). Corpo inválido também conta, como no teste manual."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        taxas = SimpleRateThrottle.THROTTLE_RATES
        SimpleRateThrottle.THROTTLE_RATES = {**taxas, 'ia': '10/min'}
        self.addCleanup(setattr, SimpleRateThrottle, 'THROTTLE_RATES', taxas)
        self.api = APIClient()
        self.equipe = criar_usuario('equipe', 'EQUIPE')
        self.outra = criar_usuario('outra', 'EQUIPE')

    def _rajada(self, usuario, n):
        self.api.force_authenticate(usuario)
        return [self.api.post('/api/v1/ia/jobs', pedido(entrada={}), format='json') for _ in range(n)]

    def test_decima_primeira_requisicao_recebe_429_com_mensagem(self):
        respostas = self._rajada(self.equipe, 11)

        self.assertEqual([r.status_code for r in respostas[:10]], [400] * 10)
        self.assertEqual(respostas[10].status_code, 429)
        self.assertIn('mensagem', respostas[10].json())
        self.assertFalse(Job.objects.exists())

    def test_limite_e_por_usuario_e_nao_global(self):
        self._rajada(self.equipe, 11)

        r = self._rajada(self.outra, 1)[0]

        self.assertEqual(r.status_code, 400)

    def test_consulta_de_job_nao_consome_o_limite(self):
        job = Job.objects.create(tarefa='requisitos', alvo_tipo='demanda', alvo_id='D', solicitante=self.equipe)
        self.api.force_authenticate(self.equipe)
        codigos = [self.api.get(f'/api/v1/jobs/{job.id}').status_code for _ in range(15)]

        self.assertEqual(codigos, [200] * 15)


class JobIdInvalidoTests(TestCase):
    def test_id_que_nao_e_uuid_devolve_404_json(self):
        api = APIClient()
        api.force_authenticate(criar_usuario('equipe', 'EQUIPE'))

        r = api.get('/api/v1/jobs/abc')

        self.assertEqual(r.status_code, 404)
        self.assertEqual(r['Content-Type'].split(';')[0], 'application/json')
        self.assertIn('mensagem', r.json())
