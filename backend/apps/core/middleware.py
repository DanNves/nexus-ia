"""Exceções não tratadas sob /api/ viram JSON `{mensagem}` sem detalhes, também com DEBUG=True.

Fora de /api/ não interfere (admin continua com as páginas do Django).
"""
import logging

from django.core.exceptions import BadRequest, PermissionDenied, SuspiciousOperation
from django.http import Http404

from apps.core.api import erros

logger = logging.getLogger('apps.core.erros')


class ErrosApiMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if not erros.eh_api(request):
            return None
        if isinstance(exception, Http404):
            return erros.resposta_json(erros.MENSAGEM_404, 404)
        if isinstance(exception, PermissionDenied):
            return erros.resposta_json(erros.MENSAGEM_403, 403)
        if isinstance(exception, (SuspiciousOperation, BadRequest)):
            # Ex.: corpo acima de DATA_UPLOAD_MAX_MEMORY_SIZE (RequestDataTooBig).
            logger.warning('Requisição recusada em %s %s: %s', request.method, request.path, type(exception).__name__)
            return erros.resposta_json(erros.MENSAGEM_400, 400)
        logger.exception('Erro não tratado em %s %s', request.method, request.path)
        return erros.resposta_json(erros.MENSAGEM_500, 500)
