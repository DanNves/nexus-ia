"""Formato único de erro da API: `{ "mensagem": str, "campos": { campo: [str] } }`.

É o contrato que o Angular já usa (claude/front/contratos.md).
"""
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from apps.core.api.mensagens import normalizar, normalizar_campos
from apps.core.excecoes import ErroNegocio

MENSAGENS = {
    exceptions.NotAuthenticated: 'Entre na sua conta para continuar.',
    exceptions.AuthenticationFailed: 'Sua sessão expirou. Entre de novo.',
    exceptions.PermissionDenied: 'Você não tem permissão para fazer isso.',
    exceptions.NotFound: 'Registro não encontrado.',
    exceptions.MethodNotAllowed: 'Operação não permitida.',
    exceptions.ParseError: 'Não foi possível ler os dados enviados.',
    exceptions.UnsupportedMediaType: 'Formato de dados não suportado.',
}


def _campos(detalhe) -> dict[str, list[str]]:
    if not isinstance(detalhe, dict):
        return {}
    campos = {}
    for campo, erros in detalhe.items():
        lista = erros if isinstance(erros, list) else [erros]
        campos[campo] = [normalizar(e) for e in lista if not isinstance(e, dict)]
    return campos


def tratar_excecao(exc, context):
    if isinstance(exc, ErroNegocio):
        corpo = {'mensagem': exc.mensagem}
        if exc.campos:
            # Serviços podem repassar erros do DRF já em texto (ex.: entrada da IA): normaliza também.
            corpo['campos'] = normalizar_campos(exc.campos)
        return Response(corpo, status=exc.status)

    resposta = exception_handler(exc, context)
    if resposta is None:
        return None  # erro inesperado: Django registra e devolve 500 sem detalhes

    if isinstance(exc, exceptions.ValidationError):
        campos = _campos(exc.detail)
        gerais = campos.pop('non_field_errors', []) + campos.pop('detail', [])
        if isinstance(exc.detail, list):
            gerais += [normalizar(e) for e in exc.detail]
        corpo = {'mensagem': gerais[0] if gerais else 'Revise os campos destacados.'}
        if campos:
            corpo['campos'] = campos
        resposta.data = corpo
        resposta.status_code = status.HTTP_400_BAD_REQUEST
        return resposta

    if isinstance(exc, exceptions.Throttled):
        espera = f' Tente de novo em {int(exc.wait)} s.' if exc.wait else ''
        resposta.data = {'mensagem': f'Muitas tentativas em pouco tempo.{espera}'}
        return resposta

    mensagem = next((m for tipo, m in MENSAGENS.items() if isinstance(exc, tipo)), None)
    resposta.data = {'mensagem': mensagem or 'Não foi possível concluir. Tente de novo.'}
    return resposta
