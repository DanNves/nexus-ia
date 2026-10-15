from django.contrib import admin

from apps.ia.models import Job, LogIA, PromptTemplate


@admin.register(PromptTemplate)
class PromptTemplateAdmin(admin.ModelAdmin):
    list_display = ('chave', 'versao', 'ativo', 'criado_em')
    list_filter = ('chave', 'ativo')

    def get_readonly_fields(self, request, obj=None):
        # Versão gravada não muda (rastreabilidade do LogIA): crie outra versão e ative-a.
        return ('chave', 'versao', 'texto', 'schema_json') if obj else ()


class SomenteLeitura(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Job)
class JobAdmin(SomenteLeitura):
    list_display = ('id', 'tarefa', 'alvo_tipo', 'alvo_id', 'estado', 'percentual', 'modelo', 'solicitante', 'criado_em')
    list_filter = ('tarefa', 'estado')
    search_fields = ('alvo_id',)
    list_select_related = ('solicitante',)


@admin.register(LogIA)
class LogIAAdmin(SomenteLeitura):
    list_display = ('criado_em', 'provedor', 'modelo', 'sucesso', 'duracao_ms', 'tokens_entrada', 'tokens_saida',
                    'tokens_raciocinio', 'substituicoes')
    list_filter = ('provedor', 'modelo', 'sucesso')
