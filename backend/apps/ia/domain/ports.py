"""Porta de acesso a modelos de linguagem (CLAUDE.md §19). Nenhum import de Django ou SDK aqui.

Todo acesso a modelo passa por `LLMProvider`. Os adaptadores concretos ficam em `apps/ia/adapters/`.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class ResultadoGeracao:
    """Saída de uma geração estruturada. `dados` já é o JSON decodificado (ainda não validado pelo esquema)."""

    dados: dict
    modelo: str
    tokens_entrada: int = 0
    tokens_saida: int = 0
    tokens_raciocinio: int = 0
    duracao_ms: int = 0


@dataclass(frozen=True)
class ParametrosGeracao:
    """Ajustes de uma chamada, vindos da tarefa (`domain/tarefas.py`). `None` = padrão do adaptador (settings).

    Cada adaptador usa o que o provedor suporta e ignora o resto (ex.: OpenAI-compatível ignora `nivel_raciocinio`).
    """

    timeout_segundos: float | None = None
    nivel_raciocinio: str | None = None
    max_tokens_saida: int | None = None


class ErroProvedor(Exception):
    """Falha ao falar com o provedor.

    `mensagem` já é tratada (português, sem segredo, pronta para o usuário).
    `temporario=True` significa "vale tentar o próximo modelo da cadeia" (503, 429, 404 de modelo, timeout,
    resposta fora do formato). `False` é falha definitiva (400, credencial, conteúdo bloqueado).
    `detalhe` é técnico (status HTTP, trecho da resposta) e vai só para o LogIA, já sem a chave.
    """

    def __init__(self, mensagem: str, *, temporario: bool, codigo: str, detalhe: str = ''):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.temporario = temporario
        self.codigo = codigo
        self.detalhe = detalhe


class LLMProvider(ABC):
    """Contrato que todo provedor de IA cumpre.

    - `nome`: chave do registro (`gemini`, `openai_compat`, `fake`...).
    - `real`: False para o adaptador falso (testes/demonstração).
    - `modelos`: cadeia de modelos, do principal para as reservas. Quem percorre a cadeia é o serviço
      (`apps/ia/services/geracao.py`), para gravar um LogIA por tentativa.
    """

    nome: str = ''
    real: bool = True

    def __init__(self, modelos: list[str] | tuple[str, ...]):
        cadeia = tuple(dict.fromkeys(m for m in modelos if m))  # sem repetidos, ordem preservada
        if not cadeia:
            raise ValueError('Informe ao menos um modelo.')
        self.modelos = cadeia

    @abstractmethod
    def gerar_estruturado(self, prompt: str, schema: dict, contexto: dict, *, modelo: str | None = None,
                          parametros: ParametrosGeracao | None = None) -> ResultadoGeracao:
        """Gera JSON no formato de `schema`.

        `prompt` são as instruções (PromptTemplate); `contexto` é `{"tarefa": str, "entrada": dict}` já anonimizado.
        `modelo=None` usa o primeiro da cadeia. `parametros` traz timeout/raciocínio/limite de saída da tarefa
        (`None` ou campo `None` = padrão do adaptador). Lança `ErroProvedor` em qualquer falha.
        """

    @abstractmethod
    def embedding(self, texto: str) -> list[float]:
        """Vetor do texto, para recuperação de contexto (§16)."""


def texto_do_contexto(contexto: dict) -> str:
    """Mensagem do usuário enviada ao modelo: só os dados, em JSON compacto."""
    entrada = json.dumps(contexto.get('entrada', {}), ensure_ascii=False, separators=(',', ':'))
    return f'Dados de entrada (JSON). Use somente estas informações:\n{entrada}'
