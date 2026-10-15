"""Exceções de negócio usadas pelos serviços de qualquer módulo."""


class ErroNegocio(Exception):
    """Regra de negócio violada. Vira resposta `{mensagem, campos}` com o status informado."""

    def __init__(self, mensagem: str, status: int = 400, campos: dict[str, list[str]] | None = None):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status
        self.campos = campos
