"""Perfis de acesso. Sem dependência de Django (camada de domínio)."""
from enum import StrEnum


class Perfil(StrEnum):
    CLIENTE = 'CLIENTE'
    EQUIPE = 'EQUIPE'


# Quem se cadastra pela tela pública é sempre cliente. Perfis da equipe são dados pelo ADM.
PERFIL_CADASTRO_PUBLICO = Perfil.CLIENTE


def conflito_de_acesso(*, perfil: str, admin: bool) -> str | None:
    """Administrador gerencia usuários e faz parte da equipe: um cliente não pode ser administrador."""
    if admin and perfil != Perfil.EQUIPE:
        return 'Só quem é da equipe pode ser administrador.'
    return None


def conflito_consigo_mesmo(*, perfil: str, admin: bool, ativo: bool) -> str | None:
    """O administrador não tira o próprio acesso (evita ficar sem ninguém para gerenciar usuários)."""
    if not ativo:
        return 'Você não pode desativar a sua própria conta.'
    if not admin:
        return 'Você não pode tirar a sua própria permissão de administrador.'
    if perfil != Perfil.EQUIPE:
        return 'Você não pode mudar o seu próprio perfil.'
    return None
