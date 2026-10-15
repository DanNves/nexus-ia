"""Comparação simples de textos curtos (sem Django). Usada para conferir que uma geração nova não repete
o que foi rejeitado (CLAUDE.md §6: REJEITADO → PROPOSTO com o motivo).

Similaridade de Jaccard entre as palavras de conteúdo (4+ letras, sem acento, sem palavras de ligação nem os
termos fixos das respostas, como "possível causa"). Não entende sinônimos: "lentidão" e "demora" contam como
palavras diferentes. Serve para pegar repetição e reformulação próxima, não equivalência de sentido.
"""
from __future__ import annotations

import re
import unicodedata

_IGNORADAS = frozenset({
    'possivel', 'causa', 'hipotese', 'pode', 'podem', 'deve', 'devem', 'sistema', 'quando', 'para', 'como', 'pelo',
    'pela', 'pelos', 'pelas', 'esta', 'este', 'isso', 'essa', 'esse', 'mais', 'muito', 'muita', 'apos', 'depois',
    'antes', 'entre', 'sobre', 'cada', 'onde', 'qual', 'quais', 'seja', 'sejam', 'estar', 'usuario', 'usuarios', 'cliente', 'clientes',
})


# A partir destes valores um texto novo é considerado repetição do rejeitado (calibrados nos casos AV-*).
LIMITE_REPETICAO_TITULO = 0.5
LIMITE_REPETICAO_CAUSA = 0.5


def _sem_acento(texto: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')


def palavras(texto: str) -> frozenset[str]:
    """Palavras de conteúdo do texto, normalizadas (minúsculas, sem acento, 4+ letras)."""
    brutas = re.findall(r'[a-z0-9]+', _sem_acento((texto or '').casefold()))
    return frozenset(p for p in brutas if len(p) >= 4 and not p.isdigit() and p not in _IGNORADAS)


def similaridade(a: str, b: str) -> float:
    """Jaccard entre as palavras de conteúdo: 0 = nada em comum, 1 = mesmas palavras."""
    pa, pb = palavras(a), palavras(b)
    if not pa or not pb:
        return 0.0
    return len(pa & pb) / len(pa | pb)


def parecido_com_algum(texto: str, outros, limite: float) -> str | None:
    """Primeiro texto de `outros` com similaridade ≥ `limite` (ou igual, ignorando maiúsculas), senão None."""
    for outro in outros:
        if texto.strip().casefold() == (outro or '').strip().casefold() or similaridade(texto, outro) >= limite:
            return outro
    return None
