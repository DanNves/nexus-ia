"""Defeito 6 do QA: mensagens padrão do DRF em português claro, preservando as personalizadas."""
import json

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase
from django.urls import reverse
from django.utils import translation
from rest_framework import fields
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.api.mensagens import MENSAGENS_PADRAO, VAZIO, normalizar

OBRIGATORIO = 'Este campo é obrigatório.'
OBJETO = 'Formato inválido: era esperado um objeto.'


def _msgids_do_drf() -> set[str]:
    def subclasses(cls):
        for sub in cls.__subclasses__():
            yield sub
            yield from subclasses(sub)

    msgids = set()
    for cls in subclasses(fields.Field):
        if cls.__module__.startswith('rest_framework'):
            for base in cls.__mro__:
                for mensagem in (base.__dict__.get('default_error_messages') or {}).values():
                    msgids.add(mensagem._args[0])  # gettext_lazy guarda o msgid original
    return msgids


def _textos(corpo) -> list[str]:
    return [corpo['mensagem']] + [m for lista in corpo.get('campos', {}).values() for m in lista]


class NormalizarTests(SimpleTestCase):
    def test_chaves_sao_msgids_reais_do_drf(self):
        self.assertFalse(set(MENSAGENS_PADRAO) - _msgids_do_drf())

    def test_traducoes_estranhas_viram_portugues_claro(self):
        with translation.override('pt-br'):
            self.assertEqual(normalizar('Este campo pode não ser nulo.'), VAZIO)
            self.assertEqual(normalizar('Este campo pode não estar em branco.'), VAZIO)
            self.assertEqual(normalizar('Certifique-se de que este campo não tenha mais de 30 caracteres.'),
                             'Use no máximo 30 caracteres.')
            self.assertEqual(normalizar('Certifique-se de que este campo tenha mais de 3 caracteres.'),
                             'Use pelo menos 3 caracteres.')
            self.assertEqual(normalizar('"abc" não é uma escolha válida.'), '"abc" não é uma opção válida.')

    def test_msgid_sem_traducao_tambem_e_trocado(self):
        self.assertEqual(normalizar('A valid biginteger is required.'), 'Informe um número inteiro.')

    def test_mensagens_personalizadas_ficam_iguais(self):
        for texto in ('Informe seu nome.', 'As senhas não são iguais.', 'Este nome de usuário já está em uso.'):
            self.assertEqual(normalizar(texto), texto)

    def test_nenhuma_mensagem_padrao_mapeada_sobra_com_pode_nao(self):
        with translation.override('pt-br'):
            for msgid in MENSAGENS_PADRAO:
                self.assertNotIn('pode não', normalizar(translation.gettext(msgid)), msgid)


class MensagensContasApiTests(APITestCase):
    def test_entrar_null_tipo_errado_e_tamanho(self):
        resp = self.client.post(reverse('auth-entrar'), {'usuario': None, 'senha': ['x']}, format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['campos'], {'usuario': [VAZIO], 'senha': ['Informe um texto.']})

        resp = self.client.post(reverse('auth-entrar'), {'usuario': 'a' * 300, 'senha': 'x'}, format='json')
        self.assertEqual(resp.data['campos'], {'usuario': ['Use no máximo 254 caracteres.']})

    def test_mensagens_personalizadas_do_serializer_sao_preservadas(self):
        resp = self.client.post(reverse('auth-entrar'), {'usuario': '', 'senha': ''}, format='json')

        self.assertEqual(resp.data['campos'], {'usuario': ['Informe seu usuário ou e-mail.'],
                                               'senha': ['Informe sua senha.']})

    def test_registro_null_e_tipo_errado(self):
        resp = self.client.post(reverse('auth-registro'), {
            'nome': None, 'usuario': {'a': 1}, 'email': 'ana@exemplo.com', 'senha': 'x', 'confirmacao': 'x',
        }, format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data['campos']['nome'], [VAZIO])
        self.assertEqual(resp.data['campos']['usuario'], ['Informe um texto.'])

    def test_corpo_que_nao_e_objeto(self):
        resp = self.client.post(reverse('auth-entrar'), [1, 2], format='json')

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {'mensagem': OBJETO})


class MensagensIaApiTests(APITestCase):
    """Só chama a API de IA (o app é mantido pelo ia-engenheiro)."""

    def setUp(self):
        equipe = get_user_model().objects.create_user(username='rafael', email='rafael@exemplo.com', nome='Rafael',
                                                      password='x', perfil='EQUIPE')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(equipe).access_token}')

    def postar(self, corpo):
        resp = self.client.post(reverse('ia-jobs'), corpo, format='json')
        self.assertEqual(resp.status_code, 400, resp.data)
        for texto in _textos(resp.data):
            self.assertNotIn('pode não', texto)
        return resp.data

    def test_envelope_null_blank_required_e_tipo_errado(self):
        corpo = self.postar({'tarefa': None, 'alvoTipo': '', 'entrada': 'texto'})

        self.assertEqual(corpo['campos']['tarefa'], [VAZIO])
        self.assertEqual(corpo['campos']['alvoTipo'], [VAZIO])
        self.assertEqual(corpo['campos']['alvoId'], [OBRIGATORIO])
        self.assertEqual(corpo['campos']['entrada'], [OBJETO])

    def test_escolha_invalida(self):
        corpo = self.postar({'tarefa': 'xyz', 'alvoTipo': 'demanda', 'alvoId': '1', 'entrada': {}})

        self.assertEqual(corpo['campos']['tarefa'], ['"xyz" não é uma opção válida.'])

    def test_entrada_aninhada_repassada_em_texto_tambem_e_normalizada(self):
        corpo = self.postar({'tarefa': 'requisitos', 'alvoTipo': 'demanda', 'alvoId': '1',
                             'entrada': {'demanda': {'codigo': None, 'descricao': ''}}})

        campos = corpo['campos']
        self.assertEqual(campos['entrada.demanda.codigo'], [VAZIO], json.dumps(campos, ensure_ascii=False))
        self.assertEqual(campos['entrada.demanda.nome'], [OBRIGATORIO])
