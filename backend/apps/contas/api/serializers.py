import re

from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.contas.domain.perfis import Perfil
from apps.contas.services import contas

USERNAME_RE = re.compile(r'^[A-Za-z0-9_.-]{3,30}$')


class UsuarioSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source='username', read_only=True)
    # Administrador gerencia usuários (tela /usuarios). Só existe na equipe.
    admin = serializers.BooleanField(source='is_staff', read_only=True)

    class Meta:
        model = get_user_model()
        fields = ['id', 'usuario', 'nome', 'email', 'organizacao', 'perfil', 'admin']
        read_only_fields = fields


# ---------- Gestão de usuários (somente administrador) ----------

MENSAGEM_PERFIL = 'Escolha Cliente ou Equipe.'


class UsuarioGestaoSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source='username', read_only=True)
    admin = serializers.BooleanField(source='is_staff', read_only=True)
    ativo = serializers.BooleanField(source='is_active', read_only=True)
    ultimoAcesso = serializers.DateTimeField(source='last_login', read_only=True)
    criadoEm = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = get_user_model()
        fields = ['id', 'usuario', 'nome', 'email', 'organizacao', 'perfil', 'admin', 'ativo', 'ultimoAcesso', 'criadoEm']
        read_only_fields = fields


def _validar_nome(valor: str) -> str:
    if len(valor) < 3:
        raise serializers.ValidationError('Informe um nome com pelo menos 3 letras.')
    return valor


def _validar_senha(senha: str, usuario) -> str:
    try:
        password_validation.validate_password(senha, usuario)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from None
    return senha


class CriarUsuarioSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=120, error_messages={'blank': 'Informe o nome.', 'required': 'Informe o nome.'})
    usuario = serializers.CharField(max_length=30, error_messages={
        'blank': 'Escolha um nome de usuário.', 'required': 'Escolha um nome de usuário.'})
    email = serializers.EmailField(max_length=254, error_messages={
        'invalid': 'Informe um e-mail válido.', 'blank': 'Informe o e-mail.', 'required': 'Informe o e-mail.'})
    organizacao = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    perfil = serializers.ChoiceField(choices=[p.value for p in Perfil], error_messages={
        'invalid_choice': MENSAGEM_PERFIL, 'required': MENSAGEM_PERFIL})
    admin = serializers.BooleanField(required=False, default=False)
    senha = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False, error_messages={
        'blank': 'Defina uma senha inicial.', 'required': 'Defina uma senha inicial.'})

    def validate_nome(self, valor):
        return _validar_nome(valor)

    def validate_usuario(self, valor):
        if not USERNAME_RE.match(valor):
            raise serializers.ValidationError('Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.')
        if contas.usuario_existe(valor):
            raise serializers.ValidationError('Este nome de usuário já está em uso.')
        return valor

    def validate_email(self, valor):
        valor = valor.lower()
        if contas.email_em_uso(valor):
            raise serializers.ValidationError('Já existe uma conta com este e-mail.')
        return valor

    def validate(self, dados):
        provisorio = get_user_model()(username=dados['usuario'], email=dados['email'], nome=dados['nome'])
        try:
            _validar_senha(dados['senha'], provisorio)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError({'senha': exc.detail}) from None
        return dados


class AlterarUsuarioSerializer(serializers.Serializer):
    """PATCH: todos os campos são opcionais; só os enviados mudam."""

    nome = serializers.CharField(max_length=120, required=False, error_messages={'blank': 'Informe o nome.'})
    email = serializers.EmailField(max_length=254, required=False, error_messages={
        'invalid': 'Informe um e-mail válido.', 'blank': 'Informe o e-mail.'})
    organizacao = serializers.CharField(max_length=120, required=False, allow_blank=True)
    perfil = serializers.ChoiceField(choices=[p.value for p in Perfil], required=False, error_messages={'invalid_choice': MENSAGEM_PERFIL})
    admin = serializers.BooleanField(required=False)
    ativo = serializers.BooleanField(required=False)

    def validate_nome(self, valor):
        return _validar_nome(valor)

    def validate_email(self, valor):
        valor = valor.lower()
        alvo = self.context['usuario']
        if get_user_model().objects.filter(email__iexact=valor).exclude(pk=alvo.pk).exists():
            raise serializers.ValidationError('Já existe uma conta com este e-mail.')
        return valor


class SenhaUsuarioSerializer(serializers.Serializer):
    senha = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False, error_messages={
        'blank': 'Defina a nova senha.', 'required': 'Defina a nova senha.'})

    def validate_senha(self, valor):
        return _validar_senha(valor, self.context['usuario'])


class RegistroSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=120, trim_whitespace=True,
                                 error_messages={'blank': 'Informe seu nome.', 'required': 'Informe seu nome.'})
    usuario = serializers.CharField(max_length=30, trim_whitespace=True,
                                    error_messages={'blank': 'Escolha um nome de usuário.', 'required': 'Escolha um nome de usuário.'})
    email = serializers.EmailField(max_length=254, error_messages={
        'invalid': 'Informe um e-mail válido.', 'blank': 'Informe seu e-mail.', 'required': 'Informe seu e-mail.'})
    organizacao = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    senha = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False,
                                  error_messages={'blank': 'Crie uma senha.', 'required': 'Crie uma senha.'})
    confirmacao = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False,
                                        error_messages={'blank': 'Repita a senha.', 'required': 'Repita a senha.'})

    def validate_nome(self, valor):
        if len(valor) < 3:
            raise serializers.ValidationError('Informe um nome com pelo menos 3 letras.')
        return valor

    def validate_usuario(self, valor):
        if not USERNAME_RE.match(valor):
            raise serializers.ValidationError('Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.')
        if contas.usuario_existe(valor):
            raise serializers.ValidationError('Este nome de usuário já está em uso.')
        return valor

    def validate_email(self, valor):
        valor = valor.lower()
        if contas.email_em_uso(valor):
            raise serializers.ValidationError('Já existe uma conta com este e-mail.')
        return valor

    def validate(self, dados):
        if dados['senha'] != dados['confirmacao']:
            raise serializers.ValidationError({'confirmacao': ['As senhas não são iguais.']})
        provisorio = get_user_model()(username=dados['usuario'], email=dados['email'], nome=dados['nome'])
        try:
            password_validation.validate_password(dados['senha'], provisorio)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'senha': list(exc.messages)}) from None
        return dados


class EntrarSerializer(serializers.Serializer):
    usuario = serializers.CharField(max_length=254, error_messages={
        'blank': 'Informe seu usuário ou e-mail.', 'required': 'Informe seu usuário ou e-mail.'})
    senha = serializers.CharField(max_length=128, trim_whitespace=False, error_messages={
        'blank': 'Informe sua senha.', 'required': 'Informe sua senha.'})
