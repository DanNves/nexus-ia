"""Exceções de negócio usadas pelos serviços de qualquer módulo."""


class ErroNegocio(Exception):
    """Regra de negócio violada. Vira resposta `{mensagem, campos?, codigo?}` com o status informado.

    `codigo` (opcional, MAIÚSCULAS) distingue erros com o mesmo status para o front decidir o que fazer
    (ex.: 429 `IA_COTA_DIARIA` × `IA_RODADAS_ESGOTADAS`). Só aparece no corpo quando informado.
    """

    def __init__(self, mensagem: str, status: int = 400, campos: dict[str, list[str]] | None = None,
                 codigo: str | None = None):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status
        self.campos = campos
        self.codigo = codigo
