"""Rotas do backend NEXUS. Toda a API fica sob /api/v1/ (CLAUDE.md §8)."""
from django.contrib import admin
from django.urls import include, path, re_path

from apps.core.api import erros

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.contas.api.urls')),
    path('api/v1/', include('apps.ia.api.urls')),
    # Sempre por último: qualquer /api/ sem rota responde 404 em JSON, mesmo com DEBUG=True.
    re_path(r'^api/', erros.rota_api_inexistente),
]

# Erros fora do DRF: JSON `{mensagem}` sob /api/, padrão do Django no restante.
handler400 = erros.tratar_400
handler404 = erros.tratar_404
handler500 = erros.tratar_500
