"""Erros fora do DRF (rota inexistente, corpo inválido, exceção não tratada) no formato `{mensagem}` sob /api/.

Fora de /api/ (admin etc.) vale o comportamento padrão do Django.
"""
from django.http import JsonResponse
from django.views import defaults
from django.views.decorators.csrf import csrf_exempt

MENSAGEM_400 = 'Não foi possível ler os dados enviados.'
MENSAGEM_403 = 'Você não tem permissão para fazer isso.'
MENSAGEM_404 = 'Rota não encontrada.'
MENSAGEM_500 = 'Erro inesperado no servidor. Tente de novo.'


def resposta_json(mensagem: str, status: int) -> JsonResponse:
    # UTF-8 direto, igual ao JSONRenderer do DRF.
    return JsonResponse({'mensagem': mensagem}, status=status, json_dumps_params={'ensure_ascii': False})


def eh_api(request) -> bool:
    return request.path.startswith('/api/')


@csrf_exempt  # sem isso, um POST numa rota inexistente receberia 403 HTML do CSRF
def rota_api_inexistente(request, *args, **kwargs):
    """Catch-all no fim do urlpatterns: responde JSON também com DEBUG=True (que ignora o handler404)."""
    return resposta_json(MENSAGEM_404, 404)


def tratar_400(request, exception=None):
    if eh_api(request):
        return resposta_json(MENSAGEM_400, 400)
    return defaults.bad_request(request, exception)


def tratar_404(request, exception=None):
    if eh_api(request):
        return resposta_json(MENSAGEM_404, 404)
    return defaults.page_not_found(request, exception)


def tratar_500(request):
    if eh_api(request):
        return resposta_json(MENSAGEM_500, 500)
    return defaults.server_error(request)
