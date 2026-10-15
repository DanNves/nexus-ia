from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.domain.perfis import Perfil

Usuario = get_user_model()


def rodar_seed(**opcoes):
    saida = StringIO()
    call_command('seed_demo', stdout=saida, **opcoes)
    return saida.getvalue()


class SeedDemoTests(APITestCase):
    def test_recusa_com_debug_desligado(self):
        # O runner de testes força DEBUG=False.
        with self.assertRaises(CommandError):
            rodar_seed()
        self.assertFalse(Usuario.objects.exists())

    def test_cria_os_dois_usuarios_com_perfis_certos(self):
        saida = rodar_seed(forcar=True)

        self.assertIn('DEMONSTRAÇÃO', saida)
        self.assertEqual(Usuario.objects.count(), 2)
        equipe = Usuario.objects.get(username='EquipeAdmin')
        self.assertEqual((equipe.perfil, equipe.nome, equipe.organizacao, equipe.email),
                         (Perfil.EQUIPE, 'Rafael Lima', 'Equipe NEXUS', 'equipe@nexus.local'))
        self.assertTrue(equipe.is_staff and equipe.is_superuser and equipe.is_active)
        cliente = Usuario.objects.get(username='Usuario')
        self.assertEqual((cliente.perfil, cliente.nome, cliente.organizacao, cliente.email),
                         (Perfil.CLIENTE, 'Marina Costa', 'Clínica Bem Viver', 'usuario@nexus.local'))
        self.assertFalse(cliente.is_staff or cliente.is_superuser)

    def test_idempotente_e_restaura_dados(self):
        rodar_seed(forcar=True)
        cliente = Usuario.objects.get(username='Usuario')
        cliente.perfil = Perfil.EQUIPE
        cliente.is_active = False
        cliente.set_password('outra-senha')
        cliente.save()

        rodar_seed(forcar=True)

        self.assertEqual(Usuario.objects.count(), 2)
        cliente.refresh_from_db()
        self.assertEqual(cliente.perfil, Perfil.CLIENTE)
        self.assertTrue(cliente.is_active)
        self.assertTrue(cliente.check_password('123'))

    def test_login_com_senha_123(self):
        rodar_seed(forcar=True)

        for identificador, perfil in (('EquipeAdmin', 'EQUIPE'), ('usuario', 'CLIENTE'), ('equipe@nexus.local', 'EQUIPE')):
            resp = self.client.post(reverse('auth-entrar'), {'usuario': identificador, 'senha': '123'}, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK, identificador)
            self.assertEqual(resp.data['usuario']['perfil'], perfil)
