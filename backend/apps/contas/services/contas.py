"""Casos de uso de contas: cadastro público, autenticação e consulta de perfil."""
from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, transaction

from apps.contas.domain.perfis import PERFIL_CADASTRO_PUBLICO, Perfil
from apps.core.excecoes import ErroNegocio
from apps.core.services import auditoria

Usuario = get_user_model()


def usuario_existe(username: str) -> bool:
    return Usuario.objects.filter(username__iexact=username).exists()


def email_em_uso(email: str) -> bool:
    return bool(email) and Usuario.objects.filter(email__iexact=email).exists()


@transaction.atomic
def registrar_cliente(*, username: str, nome: str, email: str, senha: str, organizacao: str = '') -> Usuario:
    """Cria conta pela tela pública. O perfil é sempre CLIENTE, independente do que vier na requisição."""
    usuario = Usuario(username=username, nome=nome, email=email, organizacao=organizacao, perfil=PERFIL_CADASTRO_PUBLICO)
    usuario.set_password(senha)
    try:
        with transaction.atomic():
            usuario.save()
    except IntegrityError:
        # Dois cadastros simultâneos passaram pela validação do serializer; o índice único decide.
        raise ErroNegocio('Este nome de usuário ou e-mail já está em uso.', status=400) from None
    auditoria.registrar(ator=usuario, acao='CONTA_CRIADA', entidade_tipo='usuario', entidade_id=usuario.id,
                        dados={'perfil': usuario.perfil})
    return usuario


def autenticar(identificador: str, senha: str, request=None) -> Usuario | None:
    """Aceita nome de usuário (sem diferenciar maiúsculas) ou e-mail."""
    identificador = identificador.strip()
    filtro = {'email__iexact': identificador} if '@' in identificador else {'username__iexact': identificador}
    alvo = Usuario.objects.filter(**filtro).only('username').first()
    username = alvo.username if alvo else identificador
    return authenticate(request, username=username, password=senha)


def eh_equipe(usuario) -> bool:
    """Serviço exposto a outros módulos (eles não importam o model de contas)."""
    return bool(getattr(usuario, 'is_authenticated', False)) and getattr(usuario, 'perfil', None) == Perfil.EQUIPE


def nomes_cadastrados() -> list[str]:
    """Nomes das pessoas cadastradas, usados pela IA para anonimizar textos antes do envio (CLAUDE.md §19)."""
    return list(Usuario.objects.exclude(nome='').values_list('nome', flat=True).distinct())
