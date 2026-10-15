"""Avaliação de qualidade das gerações de IA: casos fixos (entrada) + critérios verificáveis automaticamente.

- Com o adaptador falso, roda em `manage.py test` (`apps/ia/tests/test_avaliacao.py`): garante que o pipeline
  (anonimização, esquema, restauração, pós-processamento) e os critérios funcionam.
- Com o modelo real, roda sob demanda: `python manage.py ia_avaliar` (poucas chamadas; free tier). O placar vai
  para `claude/ia.md`. Não substitui a avaliação experimental CT01–CT10 do TCC (CLAUDE.md §18).
"""
