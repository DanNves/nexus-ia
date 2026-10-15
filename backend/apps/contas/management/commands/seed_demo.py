"""Cria/atualiza os usuários de demonstração pedidos pelo autor (CLAUDE.md §22).

Credenciais FRACAS e públicas ("123"): só para demonstração em localhost.
Idempotente: rodar de novo restaura senha, perfil e dados dos dois usuários.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.contas.domain.perfis import Perfil

SENHA_DEMO = '123'

USUARIOS_DEMO = [
    {
        'username': 'EquipeAdmin', 'nome': 'Rafael Lima', 'organizacao': 'Equipe NEXUS',
        'email': 'equipe@nexus.local', 'perfil': Perfil.EQUIPE, 'is_staff': True, 'is_superuser': True,
    },
    {
        'username': 'Usuario', 'nome': 'Marina Costa', 'organizacao': 'Clínica Bem Viver',
        'email': 'usuario@nexus.local', 'perfil': Perfil.CLIENTE, 'is_staff': False, 'is_superuser': False,
    },
]


class Command(BaseCommand):
    help = 'Cria/atualiza os usuários de demonstração (EquipeAdmin e Usuario, senha 123). Só com DEBUG=True.'

    def add_arguments(self, parser):
        parser.add_argument('--forcar', action='store_true',
                            help='Roda mesmo com DEBUG=False (não use fora de uma demonstração local).')

    def handle(self, *args, **opcoes):
        if not settings.DEBUG and not opcoes['forcar']:
            raise CommandError('DEBUG=False: seed_demo cria contas com senha fraca e foi bloqueado. '
                               'Use --forcar só em ambiente de demonstração local.')

        Usuario = get_user_model()
        with transaction.atomic():
            for dados in USUARIOS_DEMO:
                dados = dict(dados)
                username = dados.pop('username')
                usuario = Usuario.objects.filter(username__iexact=username).first()
                criado = usuario is None
                if criado:
                    usuario = Usuario(username=username)
                if Usuario.objects.filter(email__iexact=dados['email']).exclude(pk=usuario.pk).exists():
                    raise CommandError(f'O e-mail {dados["email"]} já pertence a outra conta.')
                for campo, valor in dados.items():
                    setattr(usuario, campo, valor)
                usuario.username = username
                usuario.is_active = True
                usuario.set_password(SENHA_DEMO)  # fora dos validadores de propósito: só no seed
                usuario.save()
                self.stdout.write(f'{"criado" if criado else "atualizado"}: {username} ({usuario.perfil})')

        self.stdout.write(self.style.WARNING(
            'Credenciais de DEMONSTRAÇÃO (senha "123"). Não use em ambiente acessível por outras pessoas.'))
        self.stdout.write(self.style.SUCCESS('Usuários de demonstração prontos.'))
