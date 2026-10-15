from django.conf import settings
from django.db import models

from apps.core.models import ModeloBase


class PromptTemplate(ModeloBase):
    """Instruções + esquema JSON de uma tarefa, versionados no banco (CLAUDE.md §19).

    Uma versão usada não é reescrita: muda-se criando outra versão e ativando-a. Só uma ativa por chave.
    """

    chave = models.CharField(max_length=60)
    versao = models.PositiveIntegerField()
    texto = models.TextField()
    schema_json = models.JSONField()
    ativo = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'template de prompt'
        verbose_name_plural = 'templates de prompt'
        ordering = ['chave', '-versao']
        constraints = [
            models.UniqueConstraint(fields=['chave', 'versao'], name='prompt_chave_versao_unica'),
            models.UniqueConstraint(fields=['chave'], condition=models.Q(ativo=True), name='prompt_um_ativo_por_chave'),
        ]

    def __str__(self):
        return f'{self.chave} v{self.versao}{" (ativo)" if self.ativo else ""}'


class Job(ModeloBase):
    """Uma solicitação de geração (contrato 202 + job, CLAUDE.md §8)."""

    class Estado(models.TextChoices):
        PENDENTE = 'PENDENTE'
        EM_EXECUCAO = 'EM_EXECUCAO'
        CONCLUIDO = 'CONCLUIDO'
        FALHOU = 'FALHOU'

    tarefa = models.CharField(max_length=40)
    alvo_tipo = models.CharField(max_length=40)
    alvo_id = models.CharField(max_length=64)
    estado = models.CharField(max_length=12, choices=Estado.choices, default=Estado.PENDENTE)
    percentual = models.PositiveSmallIntegerField(default=0)
    etapa = models.CharField(max_length=120, blank=True)
    tentativas = models.PositiveSmallIntegerField(default=0)
    entrada = models.JSONField(default=dict)  # original, não anonimizado: fica só na plataforma
    resultado = models.JSONField(null=True, blank=True)
    erro_tratado = models.CharField(max_length=300, blank=True)
    modelo = models.CharField(max_length=80, blank=True)
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='+')
    iniciado_em = models.DateTimeField(null=True, blank=True)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'job de IA'
        verbose_name_plural = 'jobs de IA'
        ordering = ['-criado_em']
        indexes = [models.Index(fields=['alvo_tipo', 'alvo_id', 'criado_em'], name='ia_job_alvo_idx')]

    def __str__(self):
        return f'{self.tarefa} {self.alvo_tipo}:{self.alvo_id} [{self.estado}]'


class LogIA(models.Model):
    """Uma linha por tentativa de chamada ao provedor (inclusive as que falharam e passaram para a reserva)."""

    job = models.ForeignKey(Job, null=True, blank=True, on_delete=models.CASCADE, related_name='logs')
    provedor = models.CharField(max_length=40)
    modelo = models.CharField(max_length=80)
    prompt_template = models.ForeignKey(PromptTemplate, null=True, on_delete=models.PROTECT, related_name='+')
    parametros = models.JSONField(default=dict, blank=True)
    tokens_entrada = models.PositiveIntegerField(default=0)
    tokens_saida = models.PositiveIntegerField(default=0)
    tokens_raciocinio = models.PositiveIntegerField(default=0)
    custo_estimado = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    duracao_ms = models.PositiveIntegerField(default=0)
    anonimizado = models.BooleanField(default=False)
    substituicoes = models.PositiveIntegerField(default=0)
    sucesso = models.BooleanField(default=False)
    erro = models.CharField(max_length=600, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'log de IA'
        verbose_name_plural = 'logs de IA'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.provedor}/{self.modelo} {"ok" if self.sucesso else "falha"}'
