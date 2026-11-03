"""Catálogo fechado de sinais e pontuação determinística dos cenários técnicos (CLAUDE.md §5.4).

"A IA extrai sinais; a regra pontua." A entrevista guiada (tarefa de IA `entrevista`) marca em cada opção de resposta
os sinais que ela indica, usando SOMENTE os códigos deste catálogo. Quando o cliente responde, os sinais das opções
escolhidas entram em `pontuar()`, que é regra pura e sempre dá o mesmo ranking para os mesmos sinais.

Pesos: herdados do banco fixo de perguntas do front (`frontend/src/app/core/api/mock-ia.ts`, `BANCO`), para o
resultado não mudar de natureza. Cada opção do BANCO virou um sinal (ex.: opção `onde=celular` → `USO_CELULAR`).
Diferenças conscientes em relação ao BANCO:
- leitor de código de barras e impressora de etiquetas viraram um sinal só (`PERIFERICOS_LOCAIS`); como cada sinal
  conta uma vez, marcar os dois soma 2 (no BANCO somava 4);
- `USO_CAMERA` e `AVISO_NO_CELULAR` são novos (a IA pode perceber isso na necessidade); o BANCO não os gera;
- respostas "não" de localização/integração não geram sinal (no BANCO tinham peso vazio): mesmo efeito.

O front espelha `CATALOGO` no mock enquanto o módulo cenário não tiver API. Para copiar: cada entrada é
`'CODIGO': ('motivo mostrado ao usuário', {'CENARIO': peso, ...})`, igual a `{ motivo, pesos }` em TypeScript.
Mudou a tabela? Atualize o espelho do front, o contrato em `claude/front/contratos.md` e crie nova versão do prompt
`entrevista` se a LISTA de códigos mudar (o esquema do prompt tem `enum` com os códigos; um teste confere).
"""
from __future__ import annotations

CENARIOS: dict[str, str] = {
    'WEB': 'Aplicação web',
    'DESKTOP': 'Software desktop',
    'MOBILE': 'Aplicativo mobile',
    'JOB': 'Rotina automática (job)',
    'API': 'API / integração',
}

# Um motivo só aparece no ranking do cenário em que o sinal pesa pelo menos isto (mesma regra do front).
PESO_MINIMO_MOTIVO = 2

# código: (motivo mostrado ao usuário, pesos por cenário)
CATALOGO: dict[str, tuple[str, dict[str, int]]] = {
    # Quem usa
    'USO_INDIVIDUAL': ('Uso individual', {'DESKTOP': 2, 'WEB': 1}),
    'EQUIPE_INTERNA': ('Usado por uma equipe interna', {'WEB': 2, 'DESKTOP': 2}),
    'PUBLICO_EXTERNO': ('Usado por pessoas de fora da organização', {'WEB': 3, 'MOBILE': 2}),
    'SEM_OPERADOR': ('Funciona sem ninguém operando', {'JOB': 4, 'API': 2}),
    # Onde / em que aparelho
    'USO_COMPUTADOR': ('Uso no computador', {'DESKTOP': 3, 'WEB': 2}),
    'USO_CELULAR': ('Uso principal no celular', {'MOBILE': 4, 'WEB': 1}),
    'USO_MULTIPLATAFORMA': ('Precisa funcionar no computador e no celular', {'WEB': 4, 'MOBILE': 1}),
    'USO_EM_CAMPO': ('Uso em campo, fora do escritório', {'MOBILE': 5}),
    # Conexão
    'PRECISA_OFFLINE': ('Precisa funcionar sem internet', {'DESKTOP': 4, 'MOBILE': 2}),
    'INTERNET_INSTAVEL': ('Internet instável', {'DESKTOP': 2, 'MOBILE': 1}),
    'INTERNET_DISPONIVEL': ('Internet sempre disponível', {'WEB': 2}),
    # Recursos do aparelho
    'PERIFERICOS_LOCAIS': ('Usa equipamento ligado ao computador (leitor, impressora)', {'DESKTOP': 2}),
    'SEM_PERIFERICOS': ('Sem equipamentos especiais', {'WEB': 1}),
    'LOCALIZACAO': ('Usa a localização do aparelho', {'MOBILE': 3}),
    'USO_CAMERA': ('Usa a câmera do aparelho (fotos, leitura de códigos)', {'MOBILE': 2}),
    'AVISO_NO_CELULAR': ('Precisa de avisos no celular', {'MOBILE': 2}),
    # Frequência e automação
    'USO_CONTINUO': ('Uso contínuo', {'WEB': 1, 'DESKTOP': 1, 'MOBILE': 1}),
    'EXECUCAO_AGENDADA': ('Acontece todo dia em horário fixo', {'JOB': 4}),
    'EXECUCAO_PERIODICA': ('Acontece em datas fixas', {'JOB': 3}),
    'SOB_DEMANDA': ('Acontece sob demanda', {'WEB': 1, 'API': 1}),
    # Resultado e integração
    'RESULTADO_EMAIL': ('Entrega o resultado por e-mail', {'JOB': 2}),
    'RESULTADO_ARQUIVO': ('Gera arquivos automaticamente', {'JOB': 2}),
    'RESULTADO_OUTRO_SISTEMA': ('Troca dados com outro sistema', {'API': 4, 'JOB': 1}),
    'INTEGRA_SISTEMA': ('Integra com um sistema existente', {'API': 2, 'WEB': 1}),
    # Volume
    'POUCOS_USUARIOS': ('Poucos usuários simultâneos', {'DESKTOP': 1}),
    'DEZENAS_USUARIOS': ('Dezenas de usuários simultâneos', {'WEB': 2}),
    'MUITOS_USUARIOS': ('Muitos usuários simultâneos', {'WEB': 3}),
}

CODIGOS: tuple[str, ...] = tuple(CATALOGO)


def eh_sinal(codigo) -> bool:
    return isinstance(codigo, str) and codigo in CATALOGO


def descricao(codigo: str) -> str:
    return CATALOGO[codigo][0]


def filtrar(sinais) -> list[str]:
    """Só os códigos do catálogo, sem repetição, na ordem em que vieram."""
    return list(dict.fromkeys(s for s in (sinais or ()) if eh_sinal(s)))


def _arredondar(valor: float) -> int:
    """Igual ao `Math.round` do JavaScript para valores positivos (o `round` do Python arredonda 2,5 para 2)."""
    return int(valor + 0.5)


def pontuar(sinais) -> list[dict]:
    """Ranking dos cenários a partir dos sinais: `[{tipo, nome, pontuacao, motivos}]`, maior pontuação primeiro.

    Mesma forma e mesma conta do `gerarRanking` do front: soma os pesos de cada sinal (cada sinal conta uma vez;
    códigos fora do catálogo são ignorados), converte em percentual do total e arredonda. Empate mantém a ordem de
    `CENARIOS`. Sem sinais, todos ficam com 0.
    """
    pontos = {tipo: 0 for tipo in CENARIOS}
    motivos: dict[str, list[str]] = {tipo: [] for tipo in CENARIOS}
    for codigo in filtrar(sinais):
        motivo, pesos = CATALOGO[codigo]
        for tipo, peso in pesos.items():
            pontos[tipo] += peso
            if peso >= PESO_MINIMO_MOTIVO:
                motivos[tipo].append(motivo)
    total = sum(pontos.values()) or 1
    ranking = [{'tipo': tipo, 'nome': nome, 'pontuacao': _arredondar(pontos[tipo] / total * 100),
                'motivos': motivos[tipo]} for tipo, nome in CENARIOS.items()]
    return sorted(ranking, key=lambda c: -c['pontuacao'])
