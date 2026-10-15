"""Roda os casos de avaliação pelo mesmo serviço de produção (`services/geracao.gerar`): prompt ativo, anonimização,
cadeia de modelos, esquema, restauração e pós-processamento. Grava LogIA como qualquer geração (sem Job).
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

from apps.ia.avaliacao.casos import CasoAvaliacao
from apps.ia.domain.ports import LLMProvider
from apps.ia.domain.tarefas import TAREFAS
from apps.ia.models import PromptTemplate
from apps.ia.services.geracao import FalhaGeracao, gerar


@dataclass
class ResultadoCaso:
    caso: CasoAvaliacao
    prompt_versao: int | None = None
    executou: bool = False          # False = a geração falhou (ex.: 503 em toda a cadeia); não é veredito de qualidade
    erro: str = ''
    modelo: str = ''
    tentativas: int = 0
    duracao_s: float = 0.0
    aprovados: list[str] = field(default_factory=list)
    falhas: list[str] = field(default_factory=list)
    saida: dict | None = None

    @property
    def passou(self) -> bool:
        return self.executou and not self.falhas


def avaliar_caso(caso: CasoAvaliacao, provedor: LLMProvider | None = None) -> ResultadoCaso:
    prompt = PromptTemplate.objects.filter(chave=TAREFAS[caso.tarefa].chave_prompt, ativo=True).first()
    resultado = ResultadoCaso(caso=caso, prompt_versao=prompt.versao if prompt else None)
    inicio = time.monotonic()
    try:
        geracao = gerar(TAREFAS[caso.tarefa], caso.entrada, provedor=provedor)
    except FalhaGeracao as exc:
        resultado.erro, resultado.tentativas = exc.mensagem, exc.tentativas
        resultado.duracao_s = time.monotonic() - inicio
        return resultado

    resultado.executou = True
    resultado.duracao_s = time.monotonic() - inicio
    resultado.modelo, resultado.tentativas, resultado.saida = geracao.resultado.modelo, geracao.tentativas, geracao.dados
    for criterio in caso.criterios(prompt.schema_json):
        motivo = criterio.verificar(caso.entrada, geracao.dados)
        if motivo:
            resultado.falhas.append(f'{criterio.nome}: {motivo}')
        else:
            resultado.aprovados.append(criterio.nome)
    return resultado
