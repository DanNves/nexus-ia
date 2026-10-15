"""Testes automatizados: IA falsa, execução síncrona e banco em memória.

Nunca chama o provedor real (custo zero e sem internet).
"""
from .base import *  # noqa: F401,F403

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
IA_PROVEDOR = 'fake'
IA_MODELOS_RESERVA = []
IA_EXECUCAO_SINCRONA = True
GEMINI_API_KEY = ''
REST_FRAMEWORK = {**REST_FRAMEWORK, 'DEFAULT_THROTTLE_RATES': {'auth': '1000/min', 'renovar': '1000/min', 'ia': '1000/min'}}  # noqa: F405
