from apps.core.models import EventoAuditoria


def registrar(*, ator, acao: str, entidade_tipo: str, entidade_id, dados: dict | None = None) -> EventoAuditoria:
    """Grava um evento de auditoria. `ator` pode ser None para ações do sistema."""
    return EventoAuditoria.objects.create(
        ator=ator if getattr(ator, 'is_authenticated', False) else None,
        acao=acao,
        entidade_tipo=entidade_tipo,
        entidade_id=str(entidade_id),
        dados=dados or {},
    )
