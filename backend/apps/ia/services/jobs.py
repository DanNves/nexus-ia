"""Casos de uso dos jobs de IA: solicitar, executar e consultar (contrato 202 + job, CLAUDE.md §8)."""
from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.contas.services.contas import eh_equipe
from apps.core.excecoes import ErroNegocio
from apps.core.services import auditoria
from apps.ia.domain.prazos import prazo_expiracao
from apps.ia.domain.reuso import JANELA_REUSO_HORAS, hash_entrada
from apps.ia.domain.tarefas import PERCENTUAL_FASES, Tarefa, obter_tarefa
from apps.ia.models import Job, PromptTemplate
from apps.ia.services import executor
from apps.ia.services.geracao import MSG_GENERICA, FalhaGeracao, gerar, timeout_da_tarefa

logger = logging.getLogger(__name__)

MSG_INTERROMPIDO = 'A geração foi interrompida. Tente de novo.'
ATIVOS = (Job.Estado.PENDENTE, Job.Estado.EM_EXECUCAO)

# Códigos dos 429 de cota (campo `codigo` do corpo do erro). O 429 do limite por minuto (throttle) não tem código.
COTA_DIARIA = 'IA_COTA_DIARIA'
RODADAS_ESGOTADAS = 'IA_RODADAS_ESGOTADAS'
COTA_ALVO = 'IA_COTA_ALVO'


def exigir_tarefa(chave: str) -> Tarefa:
    tarefa = obter_tarefa(chave)
    if tarefa is None:
        raise ErroNegocio('Tarefa de IA desconhecida.', status=400, campos={'tarefa': ['Tarefa de IA desconhecida.']})
    return tarefa


def verificar_acesso(usuario, tarefa: Tarefa) -> None:
    if tarefa.exige_equipe and not eh_equipe(usuario):
        raise ErroNegocio('Somente a equipe responsável pode pedir esta geração.', status=403)


def _janela():
    return timezone.now() - timedelta(hours=JANELA_REUSO_HORAS)


def usadas_hoje(usuario) -> int:
    """Jobs criados pelo usuário nas últimas 24 h (todas as tarefas e estados). Reaproveitamento não cria job."""
    return Job.objects.filter(solicitante=usuario, criado_em__gte=_janela()).count()


def cota_do_usuario(usuario) -> dict:
    """Resumo para `GET /api/v1/ia/status` (o front mostra e decide cair no roteiro padrão)."""
    return {'usadasHoje': usadas_hoje(usuario), 'limiteDiario': settings.IA_COTA_DIARIA_POR_USUARIO,
            'entrevistaMaxRodadas': settings.IA_ENTREVISTA_MAX_RODADAS}


def _limite_jobs_por_alvo(tarefa: Tarefa) -> int | None:
    """Teto próprio da tarefa por alvo em 24 h, além da cota geral do alvo. Entrevista: rodadas + 1 nova tentativa."""
    if tarefa.chave == 'entrevista':
        return settings.IA_ENTREVISTA_MAX_RODADAS + 1
    return None


def _reaproveitavel(usuario, tarefa: Tarefa, alvo_tipo: str, alvo_id: str, entrada_hash: str) -> Job | None:
    """Job do mesmo usuário/tarefa/alvo/entrada: CONCLUIDO nas últimas 24 h ou ainda em andamento (dentro do prazo
    de expiração, para não devolver um job que a consulta vai declarar interrompido). FALHOU nunca é reaproveitado."""
    if not tarefa.reutilizar_resultado:
        return None
    mesmos = Job.objects.filter(solicitante=usuario, tarefa=tarefa.chave, alvo_tipo=alvo_tipo, alvo_id=alvo_id,
                                entrada_hash=entrada_hash)
    ativo_desde = timezone.now() - timedelta(seconds=prazo_expiracao(timeout_da_tarefa(tarefa)))
    return (mesmos.filter(Q(estado=Job.Estado.CONCLUIDO, criado_em__gte=_janela())
                          | Q(estado__in=ATIVOS, criado_em__gte=ativo_desde))
            .order_by('-criado_em').first())


def _exigir_cota(usuario, tarefa: Tarefa, alvo_tipo: str, alvo_id: str) -> None:
    """Ordem: cota diária do usuário → rodadas da tarefa no alvo → cota geral do alvo. Cada uma com o seu código."""
    desde = _janela()
    if usadas_hoje(usuario) >= settings.IA_COTA_DIARIA_POR_USUARIO:
        raise ErroNegocio(f'Você já usou as {settings.IA_COTA_DIARIA_POR_USUARIO} gerações com IA disponíveis nas '
                          'últimas 24 horas. Tente de novo amanhã.', status=429, codigo=COTA_DIARIA)
    limite = _limite_jobs_por_alvo(tarefa)
    if limite is not None and Job.objects.filter(tarefa=tarefa.chave, alvo_tipo=alvo_tipo, alvo_id=alvo_id,
                                                 criado_em__gte=desde).count() >= limite:
        raise ErroNegocio('As rodadas de perguntas com IA desta demanda acabaram por hoje. '
                          'A entrevista continua com as perguntas padrão.', status=429, codigo=RODADAS_ESGOTADAS)
    if Job.objects.filter(alvo_tipo=alvo_tipo, alvo_id=alvo_id, criado_em__gte=desde).count() >= settings.IA_COTA_POR_ALVO:
        raise ErroNegocio(f'Este registro já teve {settings.IA_COTA_POR_ALVO} gerações nas últimas 24 horas. '
                          'Tente de novo mais tarde.', status=429, codigo=COTA_ALVO)


def solicitar_geracao(usuario, tarefa: str, alvo_tipo: str, alvo_id: str, entrada: dict) -> Job:
    """Cria o job e dispara a execução. A entrada já chega validada pelo serializer da tarefa.

    Se a tarefa reaproveita resultado e o mesmo usuário já tem um job com a mesma entrada para o mesmo alvo
    (CONCLUIDO nas últimas 24 h, ou ainda em andamento), devolve esse job (`reaproveitado=True`) sem chamar o
    modelo e sem contar cota.
    """
    definicao = exigir_tarefa(tarefa)
    verificar_acesso(usuario, definicao)
    if alvo_tipo != definicao.alvo_tipo:
        raise ErroNegocio('Tipo de registro inválido para esta tarefa.', status=400,
                          campos={'alvoTipo': [f'Para esta tarefa use "{definicao.alvo_tipo}".']})

    prompt = PromptTemplate.objects.filter(chave=definicao.chave_prompt, ativo=True).values_list('versao', flat=True)
    entrada_hash = hash_entrada(entrada, prompt.first())
    anterior = _reaproveitavel(usuario, definicao, alvo_tipo, alvo_id, entrada_hash)
    if anterior is not None:
        auditoria.registrar(ator=usuario, acao='IA_RESULTADO_REAPROVEITADO', entidade_tipo=alvo_tipo,
                            entidade_id=alvo_id, dados={'job': str(anterior.id), 'tarefa': tarefa})
        anterior.reaproveitado = True
        return anterior

    with transaction.atomic():
        _exigir_cota(usuario, definicao, alvo_tipo, alvo_id)
        job = Job.objects.create(tarefa=tarefa, alvo_tipo=alvo_tipo, alvo_id=alvo_id, entrada=entrada,
                                 entrada_hash=entrada_hash, solicitante=usuario, etapa='Na fila')
        auditoria.registrar(ator=usuario, acao='IA_GERACAO_SOLICITADA', entidade_tipo=alvo_tipo, entidade_id=alvo_id,
                            dados={'job': str(job.id), 'tarefa': tarefa})
        if not settings.IA_EXECUCAO_SINCRONA:
            transaction.on_commit(lambda: executor.submeter(executar_job, job.id))

    if settings.IA_EXECUCAO_SINCRONA:
        executar_job(job.id)
        job.refresh_from_db()
    return job


def _atualizar(job_id, **campos) -> int:
    """Só mexe em job ainda em execução: um job marcado como interrompido não volta a mudar."""
    return Job.objects.filter(id=job_id, estado=Job.Estado.EM_EXECUCAO).update(atualizado_em=timezone.now(), **campos)


def executar_job(job_id) -> None:
    """Roda a geração. Qualquer erro vira FALHOU com mensagem tratada (nunca exceção bruta para o usuário)."""
    iniciou = Job.objects.filter(id=job_id, estado=Job.Estado.PENDENTE).update(
        estado=Job.Estado.EM_EXECUCAO, iniciado_em=timezone.now(), atualizado_em=timezone.now())
    if not iniciou:
        return  # já executado, em execução por outra thread ou expirado
    job = Job.objects.get(id=job_id)
    tarefa = obter_tarefa(job.tarefa)

    def avancar(fase: int):
        _atualizar(job_id, percentual=PERCENTUAL_FASES[fase], etapa=tarefa.etapas[fase])

    try:
        if tarefa is None:
            raise FalhaGeracao(MSG_GENERICA)
        geracao = gerar(tarefa, job.entrada, job=job, ao_avancar=avancar)
    except FalhaGeracao as exc:
        _atualizar(job_id, estado=Job.Estado.FALHOU, erro_tratado=exc.mensagem, etapa='Falhou',
                   tentativas=exc.tentativas, concluido_em=timezone.now())
    except Exception:  # noqa: BLE001
        logger.exception('Falha inesperada no job de IA %s', job_id)
        _atualizar(job_id, estado=Job.Estado.FALHOU, erro_tratado=MSG_GENERICA, etapa='Falhou',
                   concluido_em=timezone.now())
    else:
        _atualizar(job_id, estado=Job.Estado.CONCLUIDO, percentual=100, etapa='Concluído', resultado=geracao.dados,
                   modelo=geracao.resultado.modelo[:80], tentativas=geracao.tentativas, concluido_em=timezone.now())


def consultar_job(usuario, job_id) -> Job:
    """Só o solicitante vê o job (404 para os demais, sem revelar que existe)."""
    job = Job.objects.filter(id=job_id, solicitante=usuario).first()
    if job is None:
        raise ErroNegocio('Registro não encontrado.', status=404)
    if job.estado in ATIVOS:
        referencia = job.iniciado_em if job.estado == Job.Estado.EM_EXECUCAO else job.criado_em
        # 3T + margem: maior que o pior caso da última tentativa (domain/prazos.py), com T da própria tarefa.
        limite = prazo_expiracao(timeout_da_tarefa(obter_tarefa(job.tarefa)))
        if referencia < timezone.now() - timedelta(seconds=limite):
            Job.objects.filter(id=job.id, estado=job.estado).update(
                estado=Job.Estado.FALHOU, erro_tratado=MSG_INTERROMPIDO, etapa='Falhou',
                concluido_em=timezone.now(), atualizado_em=timezone.now())
            job.refresh_from_db()
    return job
