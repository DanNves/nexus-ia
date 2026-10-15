from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.domain.perfis import Perfil
from apps.core.models import EventoAuditoria

Usuario = get_user_model()
COOKIE = settings.AUTH_COOKIE_REFRESH
SENHA = 'Nexus#Forte2026'


def criar_usuario(username='marina', email='marina@exemplo.com', senha=SENHA, **extra):
    usuario = Usuario(username=username, email=email, nome=extra.pop('nome', 'Marina Costa'), **extra)
    usuario.set_password(senha)
    usuario.save()
    return usuario


class RegistroTests(APITestCase):
    url = reverse('auth-registro')

    def corpo(self, **extra):
        dados = {'nome': 'Marina Costa', 'usuario': 'marina', 'email': 'Marina@Exemplo.com',
                 'organizacao': 'Clínica Bem Viver', 'senha': SENHA, 'confirmacao': SENHA}
        dados.update(extra)
        return dados

    def test_registro_cria_cliente_devolve_sessao_e_cookie(self):
        resp = self.client.post(self.url, self.corpo(), format='json')

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(resp.data), {'access', 'usuario'})
        self.assertEqual(set(resp.data['usuario']), {'id', 'usuario', 'nome', 'email', 'organizacao', 'perfil'})
        self.assertEqual(resp.data['usuario']['perfil'], 'CLIENTE')
        self.assertEqual(resp.data['usuario']['email'], 'marina@exemplo.com')
        self.assertNotIn('refresh', resp.data)

        cookie = resp.cookies[COOKIE]
        self.assertTrue(cookie.value)
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Strict')
        self.assertEqual(cookie['path'], settings.AUTH_COOKIE_PATH)
        self.assertEqual(int(cookie['max-age']), 24 * 60 * 60)
        self.assertEqual(resp['Cache-Control'], 'no-store')

        usuario = Usuario.objects.get(username='marina')
        self.assertIsNotNone(usuario.last_login)
        self.assertTrue(EventoAuditoria.objects.filter(acao='CONTA_CRIADA', entidade_id=str(usuario.id)).exists())

    def test_perfil_enviado_no_corpo_e_ignorado(self):
        resp = self.client.post(self.url, self.corpo(perfil='EQUIPE', is_staff=True), format='json')

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        usuario = Usuario.objects.get(username='marina')
        self.assertEqual(usuario.perfil, Perfil.CLIENTE)
        self.assertFalse(usuario.is_staff)

    def test_usuario_duplicado_sem_diferenciar_maiusculas(self):
        criar_usuario(username='Marina', email='outra@exemplo.com')

        resp = self.client.post(self.url, self.corpo(usuario='MARINA'), format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('usuario', resp.data['campos'])
        self.assertIn('mensagem', resp.data)

    def test_email_duplicado_sem_diferenciar_maiusculas(self):
        criar_usuario(username='outra', email='marina@exemplo.com')

        resp = self.client.post(self.url, self.corpo(email='MARINA@EXEMPLO.COM'), format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['campos']['email'], ['Já existe uma conta com este e-mail.'])

    def test_senha_fraca(self):
        resp = self.client.post(self.url, self.corpo(senha='123', confirmacao='123'), format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('senha', resp.data['campos'])
        self.assertTrue(resp.data['campos']['senha'])
        self.assertFalse(Usuario.objects.exists())

    def test_confirmacao_diferente(self):
        resp = self.client.post(self.url, self.corpo(confirmacao='Outra#Senha2026'), format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data['campos']['confirmacao'], ['As senhas não são iguais.'])

    def test_formato_de_erro_mensagem_e_campos(self):
        resp = self.client.post(self.url, {}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(resp.data), {'mensagem', 'campos'})
        self.assertIsInstance(resp.data['mensagem'], str)
        for campo in ('nome', 'usuario', 'email', 'senha', 'confirmacao'):
            self.assertIsInstance(resp.data['campos'][campo], list)
            self.assertIsInstance(resp.data['campos'][campo][0], str)


class EntrarTests(APITestCase):
    url = reverse('auth-entrar')

    def setUp(self):
        self.usuario = criar_usuario(username='Marina')

    def test_entrar_por_usuario_em_minusculas(self):
        resp = self.client.post(self.url, {'usuario': 'marina', 'senha': SENHA}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['usuario']['usuario'], 'Marina')
        self.assertTrue(resp.data['access'])
        self.assertIn(COOKIE, resp.cookies)
        self.usuario.refresh_from_db()
        self.assertIsNotNone(self.usuario.last_login)
        self.assertTrue(EventoAuditoria.objects.filter(acao='LOGIN', ator=self.usuario).exists())

    def test_entrar_por_email(self):
        resp = self.client.post(self.url, {'usuario': 'MARINA@exemplo.com', 'senha': SENHA}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['usuario']['id'], str(self.usuario.id))

    def test_senha_errada_mensagem_generica(self):
        errada = self.client.post(self.url, {'usuario': 'marina', 'senha': 'errada'}, format='json')
        inexistente = self.client.post(self.url, {'usuario': 'ninguem', 'senha': 'errada'}, format='json')

        for resp in (errada, inexistente):
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(resp.data, {'mensagem': 'Usuário ou senha incorretos.'})
            self.assertNotIn(COOKIE, resp.cookies)
        self.assertFalse(EventoAuditoria.objects.filter(acao='LOGIN').exists())

    def test_usuario_inativo_mensagem_generica(self):
        self.usuario.is_active = False
        self.usuario.save()

        resp = self.client.post(self.url, {'usuario': 'marina', 'senha': SENHA}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data, {'mensagem': 'Usuário ou senha incorretos.'})

    def test_campos_obrigatorios(self):
        resp = self.client.post(self.url, {'usuario': '', 'senha': ''}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(resp.data['campos']), {'usuario', 'senha'})

    def test_bearer_vencido_nao_bloqueia_login(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer token-invalido')

        resp = self.client.post(self.url, {'usuario': 'marina', 'senha': SENHA}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class RenovarSairTests(APITestCase):
    def setUp(self):
        self.usuario = criar_usuario()
        resp = self.client.post(reverse('auth-entrar'), {'usuario': 'marina', 'senha': SENHA}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.refresh_original = resp.cookies[COOKIE].value

    def renovar(self):
        return self.client.post(reverse('auth-renovar'))

    def test_sem_cookie_401(self):
        self.client.cookies.pop(COOKIE)

        resp = self.renovar()

        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('mensagem', resp.data)

    def test_cookie_invalido_401_e_apaga_cookie(self):
        self.client.cookies[COOKIE] = 'lixo'

        resp = self.renovar()

        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp.cookies[COOKIE].value, '')
        self.assertEqual(resp.cookies[COOKIE]['max-age'], 0)

    def test_renovar_devolve_novo_access_e_rotaciona_cookie(self):
        resp = self.renovar()

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(set(resp.data), {'access', 'usuario'})
        self.assertEqual(resp.data['usuario']['id'], str(self.usuario.id))
        novo = resp.cookies[COOKIE].value
        self.assertTrue(novo)
        self.assertNotEqual(novo, self.refresh_original)

        me = self.client.get(reverse('me'), HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')
        self.assertEqual(me.status_code, status.HTTP_200_OK)

    def test_reusar_refresh_antigo_apos_rotacao_401(self):
        self.assertEqual(self.renovar().status_code, status.HTTP_200_OK)
        self.client.cookies[COOKIE] = self.refresh_original

        resp = self.renovar()

        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_inativo_nao_renova(self):
        self.usuario.is_active = False
        self.usuario.save()

        resp = self.renovar()

        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sair_revoga_e_renovar_depois_401(self):
        resp = self.client.post(reverse('auth-sair'))

        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(resp.cookies[COOKIE].value, '')
        self.assertEqual(resp.cookies[COOKIE]['path'], settings.AUTH_COOKIE_PATH)

        self.client.cookies[COOKIE] = self.refresh_original
        self.assertEqual(self.renovar().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sair_sem_cookie_ou_com_token_invalido_204(self):
        self.client.cookies[COOKIE] = 'lixo'
        self.assertEqual(self.client.post(reverse('auth-sair')).status_code, status.HTTP_204_NO_CONTENT)
        self.client.cookies.pop(COOKIE)
        self.assertEqual(self.client.post(reverse('auth-sair')).status_code, status.HTTP_204_NO_CONTENT)


class MeTests(APITestCase):
    url = reverse('me')

    def test_sem_token_401(self):
        resp = self.client.get(self.url)

        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp.data, {'mensagem': 'Entre na sua conta para continuar.'})

    def test_token_invalido_401(self):
        resp = self.client.get(self.url, HTTP_AUTHORIZATION='Bearer abc')

        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_com_token_200(self):
        usuario = criar_usuario(perfil=Perfil.EQUIPE, organizacao='Equipe NEXUS')
        entrar = self.client.post(reverse('auth-entrar'), {'usuario': 'marina', 'senha': SENHA}, format='json')

        resp = self.client.get(self.url, HTTP_AUTHORIZATION=f'Bearer {entrar.data["access"]}')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {
            'id': str(usuario.id), 'usuario': 'marina', 'nome': 'Marina Costa', 'email': 'marina@exemplo.com',
            'organizacao': 'Equipe NEXUS', 'perfil': 'EQUIPE',
        })


class LimiteDeTentativasTests(APITestCase):
    """Revisão de segurança 2026-10-15: o limite por IP não pode ser contornado trocando o X-Forwarded-For."""

    url = reverse('auth-entrar')

    def setUp(self):
        from django.core.cache import cache
        from rest_framework.throttling import SimpleRateThrottle

        cache.clear()
        self.addCleanup(cache.clear)
        taxas = SimpleRateThrottle.THROTTLE_RATES
        SimpleRateThrottle.THROTTLE_RATES = {**taxas, 'auth': '3/min'}
        self.addCleanup(setattr, SimpleRateThrottle, 'THROTTLE_RATES', taxas)

    def test_x_forwarded_for_nao_contorna_o_limite(self):
        codigos = [
            self.client.post(self.url, {'usuario': 'x', 'senha': 'y'}, format='json',
                             HTTP_X_FORWARDED_FOR=f'10.0.0.{i}').status_code
            for i in range(5)
        ]

        self.assertEqual(codigos[:3], [400, 400, 400])
        self.assertEqual(codigos[3:], [429, 429])


class EscoposDeLimiteTests(APITestCase):
    """`renovar` tem escopo próprio (60/min): recarregar a página não pode esbarrar no limite do login (10/min)."""

    def setUp(self):
        from django.core.cache import cache
        from rest_framework.throttling import SimpleRateThrottle

        cache.clear()
        self.addCleanup(cache.clear)
        taxas = SimpleRateThrottle.THROTTLE_RATES
        SimpleRateThrottle.THROTTLE_RATES = {**taxas, 'auth': '10/min', 'renovar': '60/min'}
        self.addCleanup(setattr, SimpleRateThrottle, 'THROTTLE_RATES', taxas)
        criar_usuario()

    def test_onze_renovacoes_seguidas_nao_dao_429(self):
        self.assertEqual(self.client.post(reverse('auth-entrar'), {'usuario': 'marina', 'senha': SENHA},
                                          format='json').status_code, status.HTTP_200_OK)

        codigos = [self.client.post(reverse('auth-renovar')).status_code for _ in range(11)]

        self.assertEqual(codigos, [status.HTTP_200_OK] * 11)

    def test_onze_tentativas_de_entrar_dao_429_na_decima_primeira(self):
        codigos = [self.client.post(reverse('auth-entrar'), {'usuario': 'marina', 'senha': 'errada'},
                                    format='json').status_code for _ in range(11)]

        self.assertEqual(codigos[:10], [status.HTTP_400_BAD_REQUEST] * 10)
        self.assertEqual(codigos[10], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_renovacoes_nao_consomem_o_limite_do_login(self):
        self.client.post(reverse('auth-entrar'), {'usuario': 'marina', 'senha': SENHA}, format='json')
        for _ in range(11):
            self.client.post(reverse('auth-renovar'))

        resp = self.client.post(reverse('auth-entrar'), {'usuario': 'marina', 'senha': SENHA}, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
