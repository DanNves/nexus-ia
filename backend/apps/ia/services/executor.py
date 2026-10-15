"""Executor de jobs em thread (decisão para localhost: CLAUDE.md §30 #2 — mantém o contrato 202 + job).

No máximo `IA_MAX_SIMULTANEOS` gerações ao mesmo tempo. Cada thread fecha a própria conexão com o banco.
Se o servidor parar no meio, o job fica preso e vira FALHOU na próxima consulta (`services/jobs.py`).
"""
from __future__ import annotations

import logging
import threading

from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)

_semaforo: threading.BoundedSemaphore | None = None
_trava = threading.Lock()


def _obter_semaforo() -> threading.BoundedSemaphore:
    global _semaforo
    with _trava:
        if _semaforo is None:
            _semaforo = threading.BoundedSemaphore(max(1, settings.IA_MAX_SIMULTANEOS))
        return _semaforo


def _rodar(funcao, *args):
    try:
        with _obter_semaforo():
            funcao(*args)
    except Exception:  # noqa: BLE001 — a thread nunca pode morrer em silêncio
        logger.exception('Falha inesperada no executor de IA')
    finally:
        connection.close()


def submeter(funcao, *args) -> None:
    threading.Thread(target=_rodar, args=(funcao, *args), name='ia-job', daemon=True).start()
