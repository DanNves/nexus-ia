"""Catálogo das tarefas de IA. Cada tarefa diz quem pode pedir, sobre que tipo de registro e como o progresso aparece.

Instruções e esquema JSON NÃO ficam aqui: são versionados no banco (PromptTemplate, chave = `chave_prompt`).

Parâmetros de geração por tarefa (todos opcionais; `None` = valor global das settings):
- `timeout_segundos`: timeout de leitura por tentativa (global `IA_TIMEOUT_SEGUNDOS`). Também define o prazo de
  nova tentativa e a expiração do job (`domain/prazos.py`). Use para tarefas de saída longa (protótipo HTML) ou
  que precisam responder rápido (entrevista).
- `nivel_raciocinio`: `thinkingLevel` do Gemini (global `GEMINI_NIVEL_RACIOCINIO`). Ignorado pelo OpenAI-compatível.
  ATENÇÃO: o nível vale para TODOS os modelos da cadeia. Segundo a doc oficial (ai.google.dev/gemini-api/docs/thinking,
  2026-10-14), gemini-3.8-flash aceita só low|medium|high; `minimal` existe apenas no 3.5-flash-lite e no 3.6-flash.
  Um nível não aceito gera HTTP 400, que é falha DEFINITIVA e encerra a cadeia sem tentar a reserva. Portanto
  não use `minimal` em tarefa cuja cadeia inclua o 3.8-flash (hoje: todas, pois ele é o principal).
- `max_tokens_saida`: limite de tokens da resposta (Gemini `maxOutputTokens`; OpenAI `max_tokens`). No Gemini os
  tokens de raciocínio podem contar nesse limite; deixe folga. Estourar o limite corta o JSON → "fora do formato"
  (temporário) → próximo modelo da cadeia.
"""
from __future__ import annotations

from dataclasses import dataclass

# Fases da execução, na ordem: (preparar contexto, anonimizar, gerar, conferir). Percentual de cada uma.
PERCENTUAL_FASES = (10, 25, 40, 90)

NIVEIS_RACIOCINIO = ('minimal', 'low', 'medium', 'high')


@dataclass(frozen=True)
class Tarefa:
    chave: str
    alvo_tipo: str
    exige_equipe: bool
    etapas: tuple[str, str, str, str]  # texto mostrado ao usuário em cada fase
    chave_prompt: str
    timeout_segundos: float | None = None
    nivel_raciocinio: str | None = None
    max_tokens_saida: int | None = None

    def __post_init__(self):
        if self.timeout_segundos is not None and self.timeout_segundos <= 0:
            raise ValueError(f'{self.chave}: timeout_segundos deve ser positivo.')
        if self.nivel_raciocinio is not None and self.nivel_raciocinio not in NIVEIS_RACIOCINIO:
            raise ValueError(f'{self.chave}: nivel_raciocinio deve ser um de {NIVEIS_RACIOCINIO}.')
        if self.max_tokens_saida is not None and self.max_tokens_saida <= 0:
            raise ValueError(f'{self.chave}: max_tokens_saida deve ser positivo.')

    def pos_processar(self, entrada: dict, dados: dict) -> dict:
        """Regras de domínio aplicadas depois da validação do esquema."""
        if self.chave == 'sugestao_suporte':
            return _ajustar_sugestao(entrada, dados)
        return dados


def _ajustar_sugestao(entrada: dict, dados: dict) -> dict:
    # A IA só pode citar um conhecimento que veio na entrada; código inventado vira null.
    codigos = {c.get('codigo') for c in entrada.get('conhecimentos', [])}
    if dados.get('conhecimentoUsado') not in codigos:
        dados = {**dados, 'conhecimentoUsado': None}
    return dados


TAREFAS: dict[str, Tarefa] = {
    t.chave: t
    for t in (
        Tarefa(
            chave='requisitos',
            alvo_tipo='demanda',
            exige_equipe=True,
            etapas=('Lendo o levantamento', 'Protegendo dados pessoais', 'Escrevendo requisitos', 'Conferindo o resultado'),
            chave_prompt='requisitos',
            # Medido em 2026-10-15: 210–371 tokens de saída para 3–5 requisitos (~75 por requisito). 2000 cobre os
            # 12 do esquema com descrições 3× maiores que as medidas. O teto teórico do esquema v2 (12 × 720
            # caracteres ≈ 2400 tokens) não é coberto de propósito: saída desse tamanho já seria um desvio.
            # timeout e raciocínio: globais (20 s, low).
            max_tokens_saida=2000,
        ),
        Tarefa(
            chave='sugestao_suporte',
            alvo_tipo='chamado',
            exige_equipe=True,
            etapas=('Lendo o chamado e o histórico', 'Protegendo dados pessoais', 'Analisando possíveis causas',
                    'Conferindo o resultado'),
            chave_prompt='sugestao_suporte',
            # Medido em 2026-10-15: 82–125 tokens de saída. 1000 cobre o teto do esquema v2 (causa 600 + 8 passos
            # de 300 caracteres ≈ 850 tokens).
            max_tokens_saida=1000,
        ),
    )
}


def obter_tarefa(chave: str) -> Tarefa | None:
    return TAREFAS.get(chave)
