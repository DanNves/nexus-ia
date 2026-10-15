"""Configuração comum do backend NEXUS.

Segredos e parâmetros de ambiente vêm do arquivo `.env` (modelo em `.env.example`).
"""
import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')


def env(nome: str, padrao: str | None = None) -> str:
    valor = os.environ.get(nome, padrao)
    if valor is None:
        raise ImproperlyConfigured(f'Defina {nome} no arquivo backend/.env (veja .env.example).')
    return valor


def env_bool(nome: str, padrao: bool = False) -> bool:
    return env(nome, str(padrao)).strip().lower() in {'1', 'true', 'sim', 'yes'}


def env_lista(nome: str, padrao: str = '') -> list[str]:
    return [item.strip() for item in env(nome, padrao).split(',') if item.strip()]


SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = env_bool('DJANGO_DEBUG', False)
ALLOWED_HOSTS = env_lista('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'apps.core',
    'apps.contas',
    'apps.ia',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Por último: é o primeiro a ver exceções das views; sob /api/ devolve JSON sem detalhes.
    'apps.core.middleware.ErrosApiMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# SQLite temporário (claude/decisoes.md). `timeout` evita "database is locked" quando o
# executor de jobs da IA grava ao mesmo tempo que uma requisição.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / env('DJANGO_DB_NOME', 'db.sqlite3'),
        'OPTIONS': {'timeout': 20},
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'contas.Usuario'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Bahia'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

# ---------- API ----------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'EXCEPTION_HANDLER': 'apps.core.api.excecoes.tratar_excecao',
    'DEFAULT_THROTTLE_RATES': {
        'auth': env('API_LIMITE_AUTH', '10/min'),  # entrar e registro (força bruta)
        # Renovar roda a cada carregamento de página do Angular: limite próprio, mais folgado.
        'renovar': env('API_LIMITE_RENOVAR', '60/min'),
        'ia': env('IA_LIMITE_POR_USUARIO', '10/min'),
    },
    # Limite por IP usa só REMOTE_ADDR. Sem isto o DRF confia no X-Forwarded-For enviado pelo cliente e
    # basta trocar o header a cada tentativa para escapar do limite de login (revisão de segurança 2026-10-15).
    # Atrás de um proxy reverso real, ajuste para o número de proxies confiáveis.
    'NUM_PROXIES': 0,
}

# JWT curto + refresh rotativo com revogação (CLAUDE.md §19).
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'sub',
}

# O refresh token fica em cookie HttpOnly: o JavaScript nunca o lê.
# O Angular chama a API pelo proxy do `ng serve`, então front e API têm a mesma origem.
AUTH_COOKIE_REFRESH = 'nexus_refresh'
AUTH_COOKIE_PATH = '/api/v1/auth/'
AUTH_COOKIE_SECURE = not DEBUG
# Cookies de sessão/CSRF (só o /admin usa) seguem a mesma regra: Secure fora do DEBUG.
SESSION_COOKIE_SECURE = AUTH_COOKIE_SECURE
CSRF_COOKIE_SECURE = AUTH_COOKIE_SECURE
# CSRF nas rotas /auth/* (o refresh vai por cookie): só aceita `Origin` desta lista e
# `Sec-Fetch-Site` same-origin/none (apps/contas/api/permissoes.py).
AUTH_ORIGENS_PERMITIDAS = env_lista('AUTH_ORIGENS_PERMITIDAS', 'http://localhost:4200,http://127.0.0.1:4200')

# ---------- IA (CLAUDE.md §19; claude/ia.md) ----------

IA_PROVEDOR = env('IA_PROVEDOR', 'fake')
IA_MODELO = env('IA_MODELO', 'gemini-3.8-flash')
IA_MODELOS_RESERVA = env_lista('IA_MODELOS_RESERVA', '')
IA_TEMPERATURA = float(env('IA_TEMPERATURA', '0.3'))
IA_TIMEOUT_SEGUNDOS = float(env('IA_TIMEOUT_SEGUNDOS', '60'))
IA_COTA_POR_ALVO = int(env('IA_COTA_POR_ALVO', '20'))
IA_MAX_SIMULTANEOS = int(env('IA_MAX_SIMULTANEOS', '2'))
IA_EXECUCAO_SINCRONA = env_bool('IA_EXECUCAO_SINCRONA', False)

GEMINI_API_KEY = env('GEMINI_API_KEY', '')
GEMINI_URL_BASE = env('GEMINI_URL_BASE', 'https://generativelanguage.googleapis.com/v1beta')
GEMINI_NIVEL_RACIOCINIO = env('GEMINI_NIVEL_RACIOCINIO', 'low')

OPENAI_COMPAT_URL_BASE = env('OPENAI_COMPAT_URL_BASE', 'https://api.openai.com/v1')
OPENAI_COMPAT_API_KEY = env('OPENAI_COMPAT_API_KEY', '')
OPENAI_COMPAT_FORMATO = env('OPENAI_COMPAT_FORMATO', 'json_schema')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'loggers': {'apps': {'handlers': ['console'], 'level': 'INFO'}},
}
