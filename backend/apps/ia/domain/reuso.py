"""Identidade de uma entrada de IA para reaproveitar resultado (sem Django).

Duas entradas com o mesmo conteúdo têm o mesmo hash, qualquer que seja a ordem das chaves dos objetos (a ordem das
listas importa: respostas em outra ordem são outra entrada). A versão do prompt entra no hash: ativar uma versão
nova invalida o que foi gerado com a anterior.
"""
from __future__ import annotations

import hashlib
import json

JANELA_REUSO_HORAS = 24


def json_canonico(dado) -> str:
    return json.dumps(dado, sort_keys=True, ensure_ascii=False, separators=(',', ':'))


def hash_entrada(entrada: dict, prompt_versao: int | None = None) -> str:
    """SHA-256 (64 caracteres hex) do JSON canônico de `{"entrada": ..., "promptVersao": ...}`."""
    return hashlib.sha256(json_canonico({'entrada': entrada, 'promptVersao': prompt_versao}).encode('utf-8')).hexdigest()
