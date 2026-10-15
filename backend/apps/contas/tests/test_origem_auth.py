"""CSRF nas rotas /auth/*: Sec-Fetch-Site e Origin (revisão de segurança 2026-10-15)."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

COOKIE = settings.AUTH_COOKIE_REFRESH
SENHA = 'Nexus#Forte2026'
RECUSA = {'mensagem': 'Requisição de origem não permitida.'}
ORIGENS = ['http://localhost:4200', 'http://127.0.0.1:4200']


@override_settings(AUTH_ORIGENS_PERMITIDAS=ORIGENS)
class OrigemAuthTests(APITestCase):
    def setUp(self):
        usuario = get_user_model()(username='marina', email='marina@exemplo.com', nome='Marina Costa')
        usuario.set_password(SENHA)
        usuario.save()

    def entrar(self, **headers):
        return self.client.post(reverse('auth-entrar'), {'usuario': 'marina', 'senha': SENHA}, format='json', headers=headers)

    def assertRecusado(self, resp):
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resp.data, RECUSA)
        self.assertNotIn(COOKIE, resp.cookies)  # nem grava nem apaga o cookie

    def test_entrar_aceita_mesma_origem(self):
        for headers in ({'Origin': 'http://localhost:4200', 'Sec-Fetch-Site': 'same-origin'},
                        {'Origin': 'http://127.0.0.1:4200'},
                        {'Sec-Fetch-Site': 'none'},
                        {}):
            with self.subTest(headers=headers):
                self.assertEqual(self.entrar(**headers).status_code, status.HTTP_200_OK)

    def test_entrar_recusa_sec_fetch_site_de_outro_site(self):
        for valor in ('cross-site', 'same-site'):
            with self.subTest(valor=valor):
                self.assertRecusado(self.entrar(**{'Sec-Fetch-Site': valor}))

    def test_entrar_recusa_origin_fora_da_lista(self):
        for origem in ('http://evil.example', 'http://localhost:8001', 'null'):
            with self.subTest(origem=origem):
                self.assertRecusado(self.entrar(Origin=origem))

    def test_registro_recusado_nao_cria_conta(self):
        corpo = {'nome': 'Ana Souza', 'usuario': 'ana', 'email': 'ana@exemplo.com', 'senha': SENHA, 'confirmacao': SENHA}

        resp = self.client.post(reverse('auth-registro'), corpo, format='json', headers={'Origin': 'http://evil.example'})

        self.assertRecusado(resp)
        self.assertFalse(get_user_model().objects.filter(username='ana').exists())

    def test_renovar_cross_site_nao_apaga_nem_revoga_o_cookie(self):
        self.assertEqual(self.entrar().status_code, status.HTTP_200_OK)

        resp = self.client.post(reverse('auth-renovar'), headers={'Sec-Fetch-Site': 'cross-site'})

        self.assertRecusado(resp)
        self.assertEqual(self.client.post(reverse('auth-renovar')).status_code, status.HTTP_200_OK)

    def test_renovar_cross_site_sem_cookie_nao_apaga_cookie(self):
        # Era o ataque: POST cross-site sem cookie → 401 com Set-Cookie apagando a sessão.
        resp = self.client.post(reverse('auth-renovar'), headers={'Origin': 'http://evil.example'})

        self.assertRecusado(resp)

    def test_sair_cross_site_nao_faz_logout(self):
        self.assertEqual(self.entrar().status_code, status.HTTP_200_OK)

        resp = self.client.post(reverse('auth-sair'), headers={'Origin': 'http://evil.example',
                                                               'Sec-Fetch-Site': 'cross-site'})

        self.assertRecusado(resp)
        self.assertEqual(self.client.post(reverse('auth-renovar')).status_code, status.HTTP_200_OK)

    def test_sair_mesma_origem_funciona(self):
        self.assertEqual(self.entrar().status_code, status.HTTP_200_OK)

        resp = self.client.post(reverse('auth-sair'), headers={'Origin': 'http://localhost:4200',
                                                               'Sec-Fetch-Site': 'same-origin'})

        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.post(reverse('auth-renovar')).status_code, status.HTTP_401_UNAUTHORIZED)
