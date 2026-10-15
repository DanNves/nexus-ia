import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower

from apps.contas.domain.perfis import Perfil


class Usuario(AbstractUser):
    """Usuário do NEXUS. Login pelo nome de usuário ou e-mail; o perfil define o que ele vê."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=120)
    organizacao = models.CharField(max_length=120, blank=True)
    perfil = models.CharField(max_length=20, choices=[(p.value, p.value.title()) for p in Perfil], default=Perfil.CLIENTE)

    REQUIRED_FIELDS = ['email', 'nome']

    class Meta:
        verbose_name = 'usuário'
        verbose_name_plural = 'usuários'
        constraints = [
            models.UniqueConstraint(Lower('username'), name='usuario_username_unico_ci'),
            models.UniqueConstraint(Lower('email'), name='usuario_email_unico_ci', condition=~models.Q(email='')),
        ]

    @property
    def eh_equipe(self) -> bool:
        return self.perfil == Perfil.EQUIPE

    def __str__(self):
        return f'{self.nome} ({self.username})'
