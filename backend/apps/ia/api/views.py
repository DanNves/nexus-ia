"""Views finas da IA: validam a entrada e delegam aos serviços."""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.core.excecoes import ErroNegocio
from apps.ia.adapters import criar_provedor
from apps.ia.api.serializers import (ENTRADA_POR_TAREFA, LIMITE_ENTRADA, JobSerializer, SolicitacaoJobSerializer,
                                     tamanho_entrada)
from apps.ia.services import jobs


class LimiteIA(UserRateThrottle):
    scope = 'ia'


def _achatar(erros, prefixo: str) -> dict[str, list[str]]:
    """Erros aninhados do DRF → {"entrada.demanda.nome": ["..."]}, formato que o front já entende."""
    campos: dict[str, list[str]] = {}
    if isinstance(erros, dict):
        for chave, valor in erros.items():  # ListField usa o índice (int) como chave
            campos.update(_achatar(valor, f'{prefixo}[{chave}]' if isinstance(chave, int) else f'{prefixo}.{chave}'))
    elif isinstance(erros, list):
        textos = [str(e) for e in erros if not isinstance(e, (dict, list))]
        if textos:
            campos[prefixo] = textos
        for i, item in enumerate(erros):
            if isinstance(item, (dict, list)) and item:
                campos.update(_achatar(item, f'{prefixo}[{i}]'))
    else:
        campos[prefixo] = [str(erros)]
    return campos


class StatusIAView(APIView):
    def get(self, request):
        provedor = criar_provedor()
        return Response({
            'provedor': provedor.nome,
            'modelo': provedor.modelos[0],
            'modelosReserva': list(provedor.modelos[1:]),
            'real': provedor.real,
        })


class JobsView(APIView):
    throttle_classes = [LimiteIA]

    def post(self, request):
        envelope = SolicitacaoJobSerializer(data=request.data)
        envelope.is_valid(raise_exception=True)
        dados = envelope.validated_data
        # Permissão antes de validar a entrada: cliente recebe 403, não detalhes do formato.
        jobs.verificar_acesso(request.user, jobs.exigir_tarefa(dados['tarefa']))

        entrada = ENTRADA_POR_TAREFA[dados['tarefa']](data=dados['entrada'])
        try:
            entrada.is_valid(raise_exception=True)
        except serializers.ValidationError as exc:
            raise ErroNegocio('Revise os dados enviados para a IA.', status=400,
                              campos=_achatar(exc.detail, 'entrada')) from None
        if tamanho_entrada(entrada.validated_data) > LIMITE_ENTRADA:
            raise ErroNegocio(f'Os dados enviados passam de {LIMITE_ENTRADA} caracteres. Resuma a necessidade.',
                              status=400, campos={'entrada': ['Conteúdo grande demais.']})

        job = jobs.solicitar_geracao(request.user, dados['tarefa'], dados['alvoTipo'], dados['alvoId'],
                                     entrada.validated_data)
        return Response(JobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class JobDetalheView(APIView):
    def get(self, request, job_id):
        return Response(JobSerializer(jobs.consultar_job(request.user, job_id)).data)
