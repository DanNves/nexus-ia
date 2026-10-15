"""Uma geração completa: prompt ativo → anonimização → cadeia de modelos → esquema → restauração.

Grava um LogIA por tentativa. Usado pelo executor de jobs e pelo comando `ia_testar`.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable

from django.conf import settings

from apps.contas.services.contas import nomes_cadastrados
from apps.ia.adapters import criar_provedor
from apps.ia.adapters._http import MSG_FORMATO
from apps.ia.domain.anonimizacao import anonimizar, restaurar
from apps.ia.domain.esquema import validar
from apps.ia.domain.ports import ErroProvedor, LLMProvider, ParametrosGeracao, ResultadoGeracao
from apps.ia.domain.prazos import prazo_nova_tentativa
from apps.ia.domain.tarefas import Tarefa
from apps.ia.models import Job, LogIA, PromptTemplate

logger = logging.getLogger(__name__)

MSG_SEM_PROMPT = 'A geração não está configurada para esta tarefa. Avise o administrador.'
MSG_GENERICA = 'Não foi possível gerar agora. Tente de novo em instantes.'


def _agora() -> float:
    """Relógio monotônico (função própria para os testes simularem a passagem do tempo)."""
    return time.monotonic()


def timeout_da_tarefa(tarefa: Tarefa | None) -> float:
    """Timeout por tentativa da tarefa, com fallback na setting global `IA_TIMEOUT_SEGUNDOS`."""
    return float((tarefa.timeout_segundos if tarefa else None) or settings.IA_TIMEOUT_SEGUNDOS)


def parametros_da_tarefa(tarefa: Tarefa) -> ParametrosGeracao:
    """Parâmetros enviados ao adaptador. Timeout já resolvido; nível/limite `None` = padrão do adaptador."""
    return ParametrosGeracao(timeout_segundos=timeout_da_tarefa(tarefa), nivel_raciocinio=tarefa.nivel_raciocinio,
                             max_tokens_saida=tarefa.max_tokens_saida)


class FalhaGeracao(Exception):
    def __init__(self, mensagem: str, tentativas: int = 0):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.tentativas = tentativas


@dataclass(frozen=True)
class Geracao:
    dados: dict
    resultado: ResultadoGeracao
    tentativas: int
    substituicoes: int


def gerar(tarefa: Tarefa, entrada: dict, *, job: Job | None = None, provedor: LLMProvider | None = None,
          ao_avancar: Callable[[int], None] | None = None) -> Geracao:
    """Executa a tarefa. Lança `FalhaGeracao` com mensagem tratada; nunca devolve conteúdo fora do esquema."""
    avancar = ao_avancar or (lambda fase: None)
    inicio = _agora()  # perto de `Job.iniciado_em`, referência da expiração (domain/prazos.py)

    avancar(0)
    prompt = PromptTemplate.objects.filter(chave=tarefa.chave_prompt, ativo=True).first()
    if prompt is None:
        raise FalhaGeracao(MSG_SEM_PROMPT)

    avancar(1)
    anonimo = anonimizar(entrada, nomes_cadastrados())
    contexto = {'tarefa': tarefa.chave, 'entrada': anonimo.dados}
    provedor = provedor or criar_provedor()

    avancar(2)
    parametros = parametros_da_tarefa(tarefa)
    # Não começa nova tentativa depois deste prazo: a última sempre termina antes da expiração do job.
    prazo = prazo_nova_tentativa(parametros.timeout_segundos)
    tentativas = 0
    ultimo_erro: ErroProvedor | None = None
    for modelo in provedor.modelos:
        if tentativas and _agora() - inicio > prazo:
            logger.warning('IA %s: prazo de %.0f s esgotado; reservas restantes não tentadas', tarefa.chave, prazo)
            break
        tentativas += 1
        resultado = None
        t0 = time.monotonic()
        try:
            resultado = provedor.gerar_estruturado(prompt.texto, prompt.schema_json, contexto, modelo=modelo,
                                                   parametros=parametros)
            erros = validar(resultado.dados, prompt.schema_json)
            if erros:
                raise ErroProvedor(MSG_FORMATO, temporario=True, codigo='fora_do_esquema', detalhe='; '.join(erros))
        except ErroProvedor as exc:
            ultimo_erro = exc
            _registrar(job, provedor, modelo, prompt, parametros, anonimo.substituicoes, resultado, t0, erro=exc)
            logger.warning('IA %s/%s falhou (%s, %s)', provedor.nome, modelo, exc.codigo,
                           'temporária' if exc.temporario else 'definitiva')
            if not exc.temporario:
                break
            continue

        _registrar(job, provedor, modelo, prompt, parametros, anonimo.substituicoes, resultado, t0)
        avancar(3)
        dados = tarefa.pos_processar(entrada, restaurar(resultado.dados, anonimo.mapa))
        return Geracao(dados=dados, resultado=resultado, tentativas=tentativas, substituicoes=anonimo.substituicoes)

    raise FalhaGeracao(ultimo_erro.mensagem if ultimo_erro else MSG_GENERICA, tentativas)


def _registrar(job, provedor, modelo, prompt, parametros: ParametrosGeracao, substituicoes,
               resultado: ResultadoGeracao | None, t0, erro=None):
    duracao = resultado.duracao_ms if resultado and resultado.duracao_ms else int((time.monotonic() - t0) * 1000)
    LogIA.objects.create(
        job=job,
        provedor=provedor.nome,
        modelo=(resultado.modelo if resultado else modelo)[:80],
        prompt_template=prompt,
        parametros={'tarefa': prompt.chave, 'promptVersao': prompt.versao, 'temperatura': settings.IA_TEMPERATURA,
                    'timeoutSegundos': parametros.timeout_segundos,
                    'nivelRaciocinio': parametros.nivel_raciocinio or 'padrao',
                    'maxTokensSaida': parametros.max_tokens_saida},
        tokens_entrada=resultado.tokens_entrada if resultado else 0,
        tokens_saida=resultado.tokens_saida if resultado else 0,
        tokens_raciocinio=resultado.tokens_raciocinio if resultado else 0,
        custo_estimado=0,  # free tier; tokens ficam gravados para calcular custo se mudar de plano
        duracao_ms=duracao,
        anonimizado=True,
        substituicoes=substituicoes,
        sucesso=erro is None,
        erro=f'{erro.codigo}: {erro.detalhe}'[:600] if erro else '',
    )
