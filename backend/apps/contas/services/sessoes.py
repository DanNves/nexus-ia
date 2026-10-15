"""Casos de uso de sessão: entrar, emitir tokens, renovar (rotação) e sair (revogação).

Access token curto vai no corpo da resposta; o refresh token vai só no cookie HttpOnly
(CLAUDE.md §19). A camada de API decide onde colocar cada um; aqui ficam as regras.
"""
from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from django.db import IntegrityError, transaction
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_from_epoch

from apps.contas.services import contas
from apps.core.excecoes import ErroNegocio
from apps.core.services import auditoria

Usuario = get_user_model()

MENSAGEM_CREDENCIAL_INVALIDA = 'Usuário ou senha incorretos.'
MENSAGEM_SESSAO_INVALIDA = 'Sua sessão expirou. Entre de novo.'


@dataclass(frozen=True)
class Sessao:
    usuario: Usuario
    access: str
    refresh: str


def iniciar(usuario) -> Sessao:
    """Emite um par novo de tokens e marca o último acesso."""
    update_last_login(None, usuario)
    refresh = RefreshToken.for_user(usuario)  # já fica registrado como "outstanding"
    return Sessao(usuario=usuario, access=str(refresh.access_token), refresh=str(refresh))


def entrar(identificador: str, senha: str, request=None) -> Sessao:
    """Login por usuário ou e-mail. Erro genérico: não revela se a conta existe ou está inativa."""
    usuario = contas.autenticar(identificador, senha, request)
    if usuario is None:
        raise ErroNegocio(MENSAGEM_CREDENCIAL_INVALIDA, status=400)
    sessao = iniciar(usuario)
    auditoria.registrar(ator=usuario, acao='LOGIN', entidade_tipo='usuario', entidade_id=usuario.id)
    return sessao


def renovar(refresh_bruto: str | None) -> Sessao:
    """Troca um refresh válido por um par novo. O refresh usado é revogado (rotação + blacklist).

    A revogação usa a unicidade do BlacklistedToken: se duas renovações chegarem juntas com o
    mesmo token, só a primeira vence; a outra recebe 401 (reuso detectado).
    """
    if not refresh_bruto:
        raise ErroNegocio(MENSAGEM_SESSAO_INVALIDA, status=401)
    try:
        antigo = RefreshToken(refresh_bruto)  # valida assinatura, expiração e blacklist
    except TokenError:
        raise ErroNegocio(MENSAGEM_SESSAO_INVALIDA, status=401) from None

    usuario = Usuario.objects.filter(pk=antigo.payload.get(api_settings.USER_ID_CLAIM), is_active=True).first()
    if usuario is None:
        _revogar(antigo)
        raise ErroNegocio(MENSAGEM_SESSAO_INVALIDA, status=401)

    if not _revogar(antigo):
        raise ErroNegocio(MENSAGEM_SESSAO_INVALIDA, status=401)
    refresh = RefreshToken.for_user(usuario)
    return Sessao(usuario=usuario, access=str(refresh.access_token), refresh=str(refresh))


def sair(refresh_bruto: str | None) -> None:
    """Revoga o refresh do cookie. Token ausente, inválido ou já revogado é ignorado."""
    if not refresh_bruto:
        return
    try:
        _revogar(RefreshToken(refresh_bruto))
    except TokenError:
        return


def _revogar(token: RefreshToken) -> bool:
    """Coloca o token na blacklist. Devolve False se ele já estava revogado."""
    jti = token.payload[api_settings.JTI_CLAIM]
    try:
        with transaction.atomic():
            pendente, _ = OutstandingToken.objects.get_or_create(
                jti=jti,
                defaults={
                    'user': Usuario.objects.filter(pk=token.payload.get(api_settings.USER_ID_CLAIM)).first(),
                    'token': str(token),
                    'expires_at': datetime_from_epoch(token.payload['exp']),
                },
            )
            _, criado = BlacklistedToken.objects.get_or_create(token=pendente)
    except IntegrityError:
        return False
    return criado
