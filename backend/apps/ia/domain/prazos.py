"""Prazos de uma geração com cadeia de reserva. Sem Django: regra pura, usada pelo serviço e pela consulta do job.

Com timeout T por tentativa (read) e conexão limitada a `TIMEOUT_CONEXAO_S`, uma tentativa dura no máximo
≈ T + TIMEOUT_CONEXAO_S. O serviço não inicia nova tentativa depois de `prazo_nova_tentativa(T)` e a consulta
só declara o job interrompido depois de `prazo_expiracao(T)`, contado de `iniciado_em`. Assim:

    prazo_nova_tentativa(T) + T + TIMEOUT_CONEXAO_S  <  prazo_expiracao(T)

ou seja, a última tentativa sempre termina antes de o job poder ser marcado FALHOU (o LogIA nunca registra
sucesso de um job que o usuário viu falhar).
"""
from __future__ import annotations

TIMEOUT_CONEXAO_S = 5.0     # falha de conexão não consome o timeout inteiro da tentativa
MARGEM_INICIO_S = 5.0       # não começa tentativa "em cima" do prazo
MARGEM_EXPIRACAO_S = 15.0   # folga para conexão, gravação do resultado e relógios


def prazo_nova_tentativa(timeout: float) -> float:
    """Segundos desde o início da geração após os quais nenhuma tentativa nova é iniciada (a 1ª sempre roda)."""
    return max(0.0, 2 * timeout - MARGEM_INICIO_S)


def prazo_expiracao(timeout: float) -> float:
    """Segundos desde `iniciado_em` após os quais um job ainda ativo é considerado interrompido."""
    return 3 * timeout + MARGEM_EXPIRACAO_S
