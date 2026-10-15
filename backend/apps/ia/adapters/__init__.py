"""Registro de provedores de IA — a "tomada" para qualquer modelo do mercado.

Para adicionar um provedor novo:
1. crie `apps/ia/adapters/<nome>.py` com uma classe que herda `LLMProvider` (`apps/ia/domain/ports.py`)
   e uma função `criar(config) -> LLMProvider` que lê o que precisar de `django.conf.settings`;
2. acrescente uma linha em `PROVEDORES` abaixo;
3. escolha-o com `IA_PROVEDOR=<nome>` no `backend/.env`.

A cadeia de modelos (principal + reservas) é montada pela fábrica a partir de `IA_MODELO` e
`IA_MODELOS_RESERVA`, mas quem percorre a cadeia é o serviço de geração, que grava um LogIA por tentativa.
"""
from __future__ import annotations

from django.conf import settings

from apps.ia.adapters import fake, gemini, openai_compat
from apps.ia.domain.ports import LLMProvider

PROVEDORES = {
    'gemini': gemini.criar,
    'openai_compat': openai_compat.criar,
    'fake': fake.criar,
}


def criar_provedor(nome: str | None = None) -> LLMProvider:
    nome = nome or settings.IA_PROVEDOR
    fabrica = PROVEDORES.get(nome)
    if fabrica is None:
        raise ValueError(f'IA_PROVEDOR desconhecido: {nome!r}. Opções: {", ".join(PROVEDORES)}.')
    return fabrica(settings)
