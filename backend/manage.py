#!/usr/bin/env python
"""Utilitário de linha de comando do Django."""
import os
import sys


def main():
    # `manage.py test` usa as configurações de teste (IA falsa, banco em memória).
    padrao = 'config.settings.test' if len(sys.argv) > 1 and sys.argv[1] == 'test' else 'config.settings.dev'
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', padrao)
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django não encontrado. Ative o ambiente virtual (venv/Scripts/activate) "
            "e rode pip install -r requirements/base.txt."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
