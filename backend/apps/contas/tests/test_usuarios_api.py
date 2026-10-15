from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contas.domain.perfis import Perfil
from apps.core.models import EventoAuditoria

Usuario = get_user_model()
SENHA = 'Nexus#Forte2026'


def criar(username, perfil=Perfil.CLIENTE, admin=False, **extra):
    u = Usuario(username=username, email=f'{username}@exemplo.com', nome=extra.pop('nome', username.title() + ' Silva'),
                perfil=perfil, is_staff=admin, **extra)
    u.set_password(SENHA)
    u.save()
    return u


class GestaoUsuariosTests(APITestCase):
    def setUp(self):
        self.admin = criar('rafael', Perfil.EQUIPE, admin=True, nome='Rafael Lima')
        self.equipe = criar('joana', Perfil.EQUIPE)
        self.cliente = criar('marina', Perfil.CLIENTE, organizacao='Clínica Bem Viver')
        self.lista = reverse('usuarios')

    def entrar(self, usuario):
        self.client.force_authenticate(usuario)

    # ---------- Permissão ----------

    def test_sem_login_recebe_401(self):
        self.assertEqual(self.client.get(self.lista).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cliente_e_equipe_sem_admin_recebem_403(self):
        for u in (self.cliente, self.equipe):
            self.entrar(u)
            self.assertEqual(self.client.get(self.lista).status_code, status.HTTP_403_FORBIDDEN)
            resp = self.client.patch(reverse('usuario', args=[self.cliente.id]), {'perfil': 'EQUIPE'}, format='json')
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_cliente_marcado_como_staff_nao_e_admin(self):
        """is_staff sozinho não basta: administrador precisa ser da equipe."""
        self.cliente.is_staff = True
        self.cliente.save()
        self.entrar(self.cliente)
        self.assertEqual(self.client.get(self.lista).status_code, status.HTTP_403_FORBIDDEN)

    # ---------- Listar ----------

    def test_admin_lista_com_campos_explicitos_e_sem_senha(self):
        self.entrar(self.admin)
        resp = self.client.get(self.lista)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 3)
        self.assertEqual(set(resp.data[0]), {'id', 'usuario', 'nome', 'email', 'organizacao', 'perfil', 'admin', 'ativo', 'ultimoAcesso', 'criadoEm'})

    def test_filtros(self):
        self.entrar(self.admin)
        self.assertEqual([u['usuario'] for u in self.client.get(self.lista, {'perfil': 'CLIENTE'}).data], ['marina'])
        self.assertEqual([u['usuario'] for u in self.client.get(self.lista, {'q': 'bem viver'}).data], ['marina'])

    # ---------- Criar ----------

    def corpo(self, **extra):
        dados = {'nome': 'Paulo Souza', 'usuario': 'paulo', 'email': 'Paulo@Exemplo.com', 'organizacao': '',
                 'perfil': 'EQUIPE', 'admin': False, 'senha': SENHA}
        dados.update(extra)
        return dados

    def test_admin_cria_usuario_da_equipe(self):
        self.entrar(self.admin)
        resp = self.client.post(self.lista, self.corpo(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('senha', resp.data)
        novo = Usuario.objects.get(username='paulo')
        self.assertEqual(novo.perfil, Perfil.EQUIPE)
        self.assertEqual(novo.email, 'paulo@exemplo.com')
        self.assertTrue(novo.check_password(SENHA))
        self.assertTrue(EventoAuditoria.objects.filter(acao='USUARIO_CRIADO', entidade_id=str(novo.id), ator=self.admin).exists())

    def test_cliente_nao_pode_ser_admin(self):
        self.entrar(self.admin)
        resp = self.client.post(self.lista, self.corpo(perfil='CLIENTE', admin=True), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('admin', resp.data['campos'])

    def test_criar_valida_usuario_email_e_senha(self):
        self.entrar(self.admin)
        resp = self.client.post(self.lista, self.corpo(usuario='marina', email='MARINA@exemplo.com'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(resp.data['campos']), {'usuario', 'email'})
        resp = self.client.post(self.lista, self.corpo(senha='123'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('senha', resp.data['campos'])

    # ---------- Alterar ----------

    def test_promover_cliente_a_equipe_revoga_sessoes_e_audita(self):
        RefreshToken.for_user(self.cliente)
        self.entrar(self.admin)
        resp = self.client.patch(reverse('usuario', args=[self.cliente.id]), {'perfil': 'EQUIPE'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['perfil'], 'EQUIPE')
        self.assertEqual(BlacklistedToken.objects.filter(token__user=self.cliente).count(),
                         OutstandingToken.objects.filter(user=self.cliente).count())
        evento = EventoAuditoria.objects.get(acao='USUARIO_ALTERADO', entidade_id=str(self.cliente.id))
        self.assertEqual(evento.dados['perfil'], {'de': 'CLIENTE', 'para': 'EQUIPE'})

    def test_desativar_impede_novo_login(self):
        self.entrar(self.admin)
        self.client.patch(reverse('usuario', args=[self.equipe.id]), {'ativo': False}, format='json')
        self.client.force_authenticate(None)
        resp = self.client.post(reverse('auth-entrar'), {'usuario': 'joana', 'senha': SENHA}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_nao_tira_o_proprio_acesso(self):
        self.entrar(self.admin)
        url = reverse('usuario', args=[self.admin.id])
        for corpo in ({'ativo': False}, {'admin': False}, {'perfil': 'CLIENTE', 'admin': False}):
            resp = self.client.patch(url, corpo, format='json')
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, corpo)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active and self.admin.is_staff)
        # Dados comuns do próprio cadastro podem mudar.
        self.assertEqual(self.client.patch(url, {'organizacao': 'Equipe NEXUS'}, format='json').status_code, status.HTTP_200_OK)

    def test_email_duplicado_e_recusado(self):
        self.entrar(self.admin)
        resp = self.client.patch(reverse('usuario', args=[self.equipe.id]), {'email': 'marina@exemplo.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', resp.data['campos'])

    def test_usuario_inexistente_404(self):
        self.entrar(self.admin)
        resp = self.client.get(reverse('usuario', args=['00000000-0000-0000-0000-000000000000']))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ---------- Senha ----------

    def test_redefinir_senha(self):
        RefreshToken.for_user(self.cliente)
        self.entrar(self.admin)
        url = reverse('usuario-senha', args=[self.cliente.id])
        self.assertEqual(self.client.post(url, {'senha': '123'}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.post(url, {'senha': 'Outra#Senha2026'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.cliente.refresh_from_db()
        self.assertTrue(self.cliente.check_password('Outra#Senha2026'))
        self.assertTrue(BlacklistedToken.objects.filter(token__user=self.cliente).exists())
        evento = EventoAuditoria.objects.get(acao='SENHA_REDEFINIDA', entidade_id=str(self.cliente.id))
        self.assertNotIn('senha', evento.dados)
