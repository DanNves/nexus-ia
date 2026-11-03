"""Proteção contra CSRF nas rotas /auth/* (o refresh token viaja em cookie).

Além do SameSite=Strict do cookie, recusa requisições que o navegador marca como vindas de
outro site: `Sec-Fetch-Site` cross-site/same-site ou `Origin` fora de AUTH_ORIGENS_PERMITIDAS.
Sem esses headers (curl, testes, navegadores antigos) a requisição segue.
A recusa é 403 e NÃO mexe no cookie: um site de terceiros não consegue forçar logout.
"""
from django.conf import settings
from rest_framework.permissions import BasePermission

from apps.contas.domain.perfis import Perfil
from apps.core.excecoes import ErroNegocio

MENSAGEM_ORIGEM_RECUSADA = 'Requisição de origem não permitida.'
SEC_FETCH_SITE_ACEITOS = {'same-origin', 'none'}


def origem_confiavel(request) -> bool:
    sec_fetch_site = request.headers.get('Sec-Fetch-Site')
    if sec_fetch_site is not None and sec_fetch_site.strip().lower() not in SEC_FETCH_SITE_ACEITOS:
        return False
    origem = request.headers.get('Origin')
    if origem is not None and origem.strip().rstrip('/') not in settings.AUTH_ORIGENS_PERMITIDAS:
        return False
    return True


class EhAdministrador(BasePermission):
    """Gestão de usuários: só administrador ativo da equipe (is_staff + perfil EQUIPE)."""

    message = 'Só administradores podem gerenciar usuários.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_active and u.is_staff and getattr(u, 'perfil', None) == Perfil.EQUIPE)


class OrigemConfiavel(BasePermission):
    def has_permission(self, request, view):
        if not origem_confiavel(request):
            # ErroNegocio (e não PermissionDenied) para levar a mensagem própria no corpo.
            raise ErroNegocio(MENSAGEM_ORIGEM_RECUSADA, status=403)
        return True
