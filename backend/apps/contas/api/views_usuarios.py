"""Gestão de usuários (tela /usuarios do Angular). Somente administrador; contrato em claude/front/contratos.md."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contas.api.permissoes import EhAdministrador
from apps.contas.api.serializers import (
    AlterarUsuarioSerializer, CriarUsuarioSerializer, SenhaUsuarioSerializer, UsuarioGestaoSerializer,
)
from apps.contas.services import usuarios

ATIVO = {'true': True, 'false': False}


class UsuariosView(APIView):
    permission_classes = [EhAdministrador]

    def get(self, request):
        q = request.query_params
        lista = usuarios.listar(
            busca=q.get('q', '').strip()[:100],
            perfil=q.get('perfil', ''),
            ativo=ATIVO.get(q.get('ativo', '').lower()),
        )
        return Response(UsuarioGestaoSerializer(lista, many=True).data)

    def post(self, request):
        serializer = CriarUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        novo = usuarios.criar(
            ator=request.user, username=d['usuario'], nome=d['nome'], email=d['email'],
            organizacao=d.get('organizacao', ''), perfil=d['perfil'], admin=d['admin'], senha=d['senha'],
        )
        return Response(UsuarioGestaoSerializer(novo).data, status=status.HTTP_201_CREATED)


class UsuarioView(APIView):
    permission_classes = [EhAdministrador]

    def get(self, request, usuario_id):
        return Response(UsuarioGestaoSerializer(usuarios.obter(usuario_id)).data)

    def patch(self, request, usuario_id):
        alvo = usuarios.obter(usuario_id)
        serializer = AlterarUsuarioSerializer(data=request.data, context={'usuario': alvo})
        serializer.is_valid(raise_exception=True)
        alterado = usuarios.alterar(ator=request.user, usuario=alvo, dados=serializer.validated_data)
        return Response(UsuarioGestaoSerializer(alterado).data)


class UsuarioSenhaView(APIView):
    permission_classes = [EhAdministrador]

    def post(self, request, usuario_id):
        alvo = usuarios.obter(usuario_id)
        serializer = SenhaUsuarioSerializer(data=request.data, context={'usuario': alvo})
        serializer.is_valid(raise_exception=True)
        usuarios.redefinir_senha(ator=request.user, usuario=alvo, senha=serializer.validated_data['senha'])
        return Response(status=status.HTTP_204_NO_CONTENT)
