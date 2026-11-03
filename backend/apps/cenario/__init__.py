"""Módulo `cenario` (CLAUDE.md §5.4, §7): sinais, catálogo de cenários técnicos, pontuação e recomendação.

Por enquanto só existe a camada de domínio (`domain/`), sem models nem API: o pacote NÃO está em INSTALLED_APPS
porque não tem models, migrações, admin nem sinais do Django. Quando ganhar models (Sinal, AnaliseCenario,
Recomendacao), crie `apps.py` e registre em `config/settings/base.py`.
"""
