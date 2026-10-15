"""Cookie do refresh token: HttpOnly, SameSite=Strict, restrito ao caminho /api/v1/auth/.

O JavaScript nunca lê o refresh; o Angular guarda só o access token em memória.
"""
from django.conf import settings
from rest_framework_simplejwt.settings import api_settings


def ler_refresh(request) -> str | None:
    return request.COOKIES.get(settings.AUTH_COOKIE_REFRESH) or None


def gravar_refresh(response, refresh: str) -> None:
    response.set_cookie(
        settings.AUTH_COOKIE_REFRESH,
        refresh,
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        path=settings.AUTH_COOKIE_PATH,
        secure=settings.AUTH_COOKIE_SECURE,
        httponly=True,
        samesite='Strict',
    )


def apagar_refresh(response) -> None:
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path=settings.AUTH_COOKIE_PATH, samesite='Strict')
