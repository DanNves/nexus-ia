import json

from django.contrib.auth import get_user_model
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from django.urls import path
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.api import erros

ROTA_INEXISTENTE = '/api/v1/rota-inexistente'


class RotaApiInexistenteTests(TestCase):
    def assertJson404(self, resp):
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp['Content-Type'], 'application/json')
        self.assertEqual(resp.json(), {'mensagem': 'Rota não encontrada.'})

    def test_sem_token(self):
        self.assertJson404(self.client.get(ROTA_INEXISTENTE))

    def test_com_token(self):
        usuario = get_user_model().objects.create_user(username='ana', email='ana@exemplo.com', nome='Ana', password='x')
        access = str(RefreshToken.for_user(usuario).access_token)

        self.assertJson404(self.client.get(ROTA_INEXISTENTE, HTTP_AUTHORIZATION=f'Bearer {access}'))

    def test_post_sem_csrf_tambem_responde_404_json(self):
        cliente = self.client_class(enforce_csrf_checks=True)

        self.assertJson404(cliente.post(ROTA_INEXISTENTE, {'a': 1}, content_type='application/json'))

    @override_settings(DEBUG=True)
    def test_com_debug_ligado_continua_json(self):
        self.assertJson404(self.client.get('/api/v2/qualquer/coisa'))

    def test_fora_da_api_mantem_404_padrao(self):
        resp = self.client.get('/nao-existe')

        self.assertEqual(resp.status_code, 404)
        self.assertNotEqual(resp['Content-Type'], 'application/json')

    def test_admin_continua_normal(self):
        resp = self.client.get('/admin/login/')

        self.assertEqual(resp.status_code, 200)
        self.assertIn('text/html', resp['Content-Type'])


class HandlersTests(SimpleTestCase):
    def setUp(self):
        self.fabrica = RequestFactory()

    def test_handler500_api_json_sem_detalhes(self):
        resp = erros.tratar_500(self.fabrica.get('/api/v1/demandas'))

        self.assertEqual(resp.status_code, 500)
        self.assertEqual(resp['Content-Type'], 'application/json')
        self.assertEqual(json.loads(resp.content), {'mensagem': 'Erro inesperado no servidor. Tente de novo.'})

    def test_handler500_fora_da_api_padrao(self):
        resp = erros.tratar_500(self.fabrica.get('/admin/'))

        self.assertEqual(resp.status_code, 500)
        self.assertIn('text/html', resp['Content-Type'])

    def test_handler404_api_json(self):
        resp = erros.tratar_404(self.fabrica.get('/api/v1/x'), Exception('detalhe interno'))

        self.assertEqual(resp.status_code, 404)
        self.assertNotIn(b'detalhe interno', resp.content)


class Handler400Tests(SimpleTestCase):
    def test_handler400_api_json(self):
        resp = erros.tratar_400(RequestFactory().post('/api/v1/auth/entrar'), Exception('detalhe interno'))

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(json.loads(resp.content), {'mensagem': 'Não foi possível ler os dados enviados.'})

    def test_handler400_fora_da_api_padrao(self):
        resp = erros.tratar_400(RequestFactory().post('/admin/login/'), Exception('x'))

        self.assertEqual(resp.status_code, 400)
        self.assertIn('text/html', resp['Content-Type'])


class CorpoGrandeTests(TestCase):
    """Corpo acima de DATA_UPLOAD_MAX_MEMORY_SIZE (2,5 MB) devolvia 400 em HTML."""

    def postar_grande(self):
        corpo = '{"usuario": "' + 'a' * (3 * 1024 * 1024) + '", "senha": "x"}'
        return self.client.post('/api/v1/auth/entrar', corpo, content_type='application/json')

    def assertJson400(self, resp):
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp['Content-Type'], 'application/json')
        self.assertEqual(resp.json(), {'mensagem': 'Não foi possível ler os dados enviados.'})

    def test_corpo_grande_json(self):
        with self.assertLogs('apps.core.erros', 'WARNING'):
            self.assertJson400(self.postar_grande())

    @override_settings(DEBUG=True)
    def test_corpo_grande_json_com_debug(self):
        with self.assertLogs('apps.core.erros', 'WARNING'):
            self.assertJson400(self.postar_grande())


# URLconf só destes testes: uma view sob /api/ e outra fora dela que estouram exceção.
def _explode(request):
    raise RuntimeError('segredo interno: /caminho/do/servidor')


urlpatterns = [
    path('api/v1/explode', _explode),
    path('fora/explode', _explode),
]


@override_settings(ROOT_URLCONF=__name__)
class MiddlewareErroNaoTratadoTests(SimpleTestCase):
    def assertJson500(self, resp):
        self.assertEqual(resp.status_code, 500)
        self.assertEqual(resp['Content-Type'], 'application/json')
        self.assertEqual(resp.json(), {'mensagem': 'Erro inesperado no servidor. Tente de novo.'})
        self.assertNotIn(b'segredo', resp.content)

    def test_api_vira_500_json_e_registra_log(self):
        with self.assertLogs('apps.core.erros', 'ERROR') as logs:
            self.assertJson500(self.client.get('/api/v1/explode'))
        self.assertIn('RuntimeError', '\n'.join(logs.output))  # traceback vai para o log, não para a resposta

    @override_settings(DEBUG=True)
    def test_api_com_debug_nao_mostra_pagina_tecnica(self):
        with self.assertLogs('apps.core.erros', 'ERROR'):
            self.assertJson500(self.client.get('/api/v1/explode'))

    def test_fora_da_api_nao_interfere(self):
        with self.assertRaises(RuntimeError):
            self.client.get('/fora/explode')
