import re

from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.contas.services import contas

USERNAME_RE = re.compile(r'^[A-Za-z0-9_.-]{3,30}$')


class UsuarioSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source='username', read_only=True)

    class Meta:
        model = get_user_model()
        fields = ['id', 'usuario', 'nome', 'email', 'organizacao', 'perfil']
        read_only_fields = fields


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
