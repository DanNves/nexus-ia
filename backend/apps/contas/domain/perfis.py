"""Perfis de acesso. Sem dependência de Django (camada de domínio)."""
from enum import StrEnum


class Perfil(StrEnum):
    CLIENTE = 'CLIENTE'
    EQUIPE = 'EQUIPE'


# Quem se cadastra pela tela pública é sempre cliente. Perfis da equipe são dados pelo ADM.
PERFIL_CADASTRO_PUBLICO = Perfil.CLIENTE
