"""Autenticação e perfil (claude/front/contratos.md, 2026-10-15 — bloco "Autenticação").

Views finas: validam a entrada com serializer e delegam aos serviços de `contas` e `sessoes`.
"""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.contas.api import cookies
from apps.contas.api.permissoes import OrigemConfiavel
from apps.contas.api.serializers import EntrarSerializer, RegistroSerializer, UsuarioSerializer
from apps.contas.services import contas, sessoes


def _resposta_sessao(sessao: sessoes.Sessao, status_http: int = status.HTTP_200_OK) -> Response:
    resposta = Response({'access': sessao.access, 'usuario': UsuarioSerializer(sessao.usuario).data}, status=status_http)
    cookies.gravar_refresh(resposta, sessao.refresh)
    resposta['Cache-Control'] = 'no-store'
    return resposta


class _AuthPublica(APIView):
    """Rotas públicas de autenticação: sem Bearer (um access vencido não pode bloquear o login).

    `OrigemConfiavel` recusa (403, sem tocar no cookie) requisições vindas de outro site.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny, OrigemConfiavel]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


class RegistroView(_AuthPublica):
    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data
        usuario = contas.registrar_cliente(
            username=dados['usuario'], nome=dados['nome'], email=dados['email'],
            senha=dados['senha'], organizacao=dados.get('organizacao', ''),
        )
        return _resposta_sessao(sessoes.iniciar(usuario), status.HTTP_201_CREATED)


class EntrarView(_AuthPublica):
    def post(self, request):
        serializer = EntrarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data
        return _resposta_sessao(sessoes.entrar(dados['usuario'], dados['senha'], request))


class RenovarView(_AuthPublica):
    # O Angular renova a cada carregamento de página; o limite de 10/min do login bloquearia recargas.
    throttle_scope = 'renovar'

    def post(self, request):
        return _resposta_sessao(sessoes.renovar(cookies.ler_refresh(request)))

    def handle_exception(self, exc):
        resposta = super().handle_exception(exc)
        if resposta is not None and resposta.status_code == status.HTTP_401_UNAUTHORIZED:
            cookies.apagar_refresh(resposta)  # cookie inválido não fica no navegador
        return resposta


class SairView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny, OrigemConfiavel]

    def post(self, request):
        sessoes.sair(cookies.ler_refresh(request))
        resposta = Response(status=status.HTTP_204_NO_CONTENT)
        cookies.apagar_refresh(resposta)
        return resposta


class MeView(APIView):
    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)
