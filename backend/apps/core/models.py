import uuid

from django.conf import settings
from django.db import models


class ModeloBase(models.Model):
    """PK UUID e datas de criação/alteração (docs/MODELO_DADOS.md §1)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class _AuditoriaQuerySet(models.QuerySet):
    """Bloqueia alteração e exclusão em lote (que não passam por save()/delete() do model).

    Só vale para `objects`; o `_base_manager` continua padrão para o Django poder aplicar
    o SET_NULL em `ator` quando um usuário é excluído.
    """

    def update(self, **kwargs):
        raise ValueError('Eventos de auditoria não podem ser alterados.')

    def delete(self):
        raise ValueError('Eventos de auditoria não podem ser apagados.')


class EventoAuditoria(models.Model):
    """Registro append-only: uma vez gravado, não muda nem é apagado (CLAUDE.md §19)."""

    objects = _AuditoriaQuerySet.as_manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ator = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    acao = models.CharField(max_length=60)
    entidade_tipo = models.CharField(max_length=60)
    entidade_id = models.CharField(max_length=64)
    dados = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']
        indexes = [models.Index(fields=['entidade_tipo', 'entidade_id'])]
        verbose_name = 'evento de auditoria'
        verbose_name_plural = 'eventos de auditoria'

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError('Eventos de auditoria não podem ser alterados.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError('Eventos de auditoria não podem ser apagados.')

    def __str__(self):
        return f'{self.acao} {self.entidade_tipo}:{self.entidade_id}'
