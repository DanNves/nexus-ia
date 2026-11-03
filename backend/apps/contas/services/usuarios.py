"""Gestão de usuários pelo administrador: listar, criar, alterar perfil/acesso e redefinir senha.

Toda alteração gera evento de auditoria (CLAUDE.md §19). Mudanças que reduzem o acesso de alguém
(desativar, trocar perfil, tirar administrador, nova senha) revogam as sessões abertas dessa pessoa.
"""
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q, QuerySet

from apps.contas.domain.perfis import Perfil, conflito_consigo_mesmo, conflito_de_acesso
from apps.contas.services import sessoes
from apps.core.excecoes import ErroNegocio
from apps.core.services import auditoria

Usuario = get_user_model()

CAMPOS_ALTERAVEIS = ('nome', 'email', 'organizacao', 'perfil', 'admin', 'ativo')


def listar(*, busca: str = '', perfil: str = '', ativo: bool | None = None) -> QuerySet:
    qs = Usuario.objects.all()
    if busca:
        qs = qs.filter(Q(nome__icontains=busca) | Q(username__icontains=busca) | Q(email__icontains=busca)
                       | Q(organizacao__icontains=busca))
    if perfil in Perfil.__members__:
        qs = qs.filter(perfil=perfil)
    if ativo is not None:
        qs = qs.filter(is_active=ativo)
    return qs.order_by('-is_active', 'nome', 'username')


def obter(usuario_id) -> Usuario:
    usuario = Usuario.objects.filter(pk=usuario_id).first()
    if usuario is None:
        raise ErroNegocio('Usuário não encontrado.', status=404)
    return usuario


@transaction.atomic
def criar(*, ator, username: str, nome: str, email: str, organizacao: str, perfil: str, admin: bool, senha: str) -> Usuario:
    if (erro := conflito_de_acesso(perfil=perfil, admin=admin)):
        raise ErroNegocio(erro, status=400, campos={'admin': [erro]})
    usuario = Usuario(username=username, nome=nome, email=email, organizacao=organizacao, perfil=perfil, is_staff=admin)
    usuario.set_password(senha)
    try:
        with transaction.atomic():
            usuario.save()
    except IntegrityError:
        raise ErroNegocio('Este nome de usuário ou e-mail já está em uso.', status=400) from None
    auditoria.registrar(ator=ator, acao='USUARIO_CRIADO', entidade_tipo='usuario', entidade_id=usuario.id,
                        dados={'perfil': perfil, 'admin': admin})
    return usuario


@transaction.atomic
def alterar(*, ator, usuario: Usuario, dados: dict) -> Usuario:
    """Aplica só os campos enviados. Validações de unicidade de e-mail ficam no serializer."""
    antes = _estado(usuario)
    novo = {**antes, **{k: v for k, v in dados.items() if k in CAMPOS_ALTERAVEIS}}

    if (erro := conflito_de_acesso(perfil=novo['perfil'], admin=novo['admin'])):
        raise ErroNegocio(erro, status=400, campos={'admin': [erro]})
    if usuario.pk == ator.pk and (erro := conflito_consigo_mesmo(perfil=novo['perfil'], admin=novo['admin'], ativo=novo['ativo'])):
        raise ErroNegocio(erro, status=400)

    usuario.nome = novo['nome']
    usuario.email = novo['email']
    usuario.organizacao = novo['organizacao']
    usuario.perfil = novo['perfil']
    usuario.is_staff = novo['admin']
    usuario.is_active = novo['ativo']
    try:
        with transaction.atomic():
            usuario.save()
    except IntegrityError:
        raise ErroNegocio('Já existe uma conta com este e-mail.', status=400, campos={'email': ['Já existe uma conta com este e-mail.']}) from None

    mudancas = {campo: {'de': antes[campo], 'para': novo[campo]} for campo in CAMPOS_ALTERAVEIS if antes[campo] != novo[campo]}
    if mudancas:
        auditoria.registrar(ator=ator, acao='USUARIO_ALTERADO', entidade_tipo='usuario', entidade_id=usuario.id, dados=mudancas)
    if {'perfil', 'admin', 'ativo'} & mudancas.keys():
        sessoes.revogar_todas(usuario)
    return usuario


@transaction.atomic
def redefinir_senha(*, ator, usuario: Usuario, senha: str) -> None:
    usuario.set_password(senha)
    usuario.save(update_fields=['password'])
    sessoes.revogar_todas(usuario)
    # A senha nunca vai para a auditoria.
    auditoria.registrar(ator=ator, acao='SENHA_REDEFINIDA', entidade_tipo='usuario', entidade_id=usuario.id)


def _estado(usuario: Usuario) -> dict:
    return {
        'nome': usuario.nome, 'email': usuario.email, 'organizacao': usuario.organizacao,
        'perfil': usuario.perfil, 'admin': usuario.is_staff, 'ativo': usuario.is_active,
    }
