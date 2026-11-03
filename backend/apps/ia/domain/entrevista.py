"""Regras determinísticas da tarefa `entrevista` aplicadas DEPOIS da IA (sem Django).

A IA propõe uma rodada de perguntas; aqui se garante o que dá para garantir sem julgamento:
- pergunta igual ou muito parecida com uma já respondida (ou com outra da mesma rodada) sai;
- opções "Outro"/"Não sei" saem (a interface já oferece as duas);
- `valor` das opções e `id` das perguntas viram slugs seguros, sem repetição e sem colidir com ids já respondidos;
- sinais fora do catálogo (`apps.cenario.domain.sinais`) saem;
- pergunta que ficar com menos de `MIN_OPCOES` opções sai (o contrato do front é 3 a 5);
- `suficiente` vira true na última rodada permitida ou quando não sobra pergunta.

O catálogo de sinais é o contrato público (domínio puro) do módulo cenário; importá-lo não fere a regra de fronteira
(nenhum model de outro módulo é usado).
"""
from __future__ import annotations

import re

from apps.cenario.domain.sinais import filtrar as filtrar_sinais
from apps.ia.domain.texto import sem_acento

MAX_PERGUNTAS = 5
MIN_OPCOES = 3
MAX_OPCOES = 5
MAX_LACUNAS = 5
TAMANHO_SLUG = 40

# Similaridade de Jaccard entre "radicais" (5 primeiras letras) das palavras de conteúdo dos enunciados. A partir
# deste valor a pergunta é considerada repetição. Calibrado nos testes (`test_entrevista.py`): pega a mesma pergunta
# com outra ordem/flexão ("Precisa funcionar sem internet?" × "O sistema precisa funcionar sem internet?") e deixa
# passar perguntas diferentes sobre o mesmo tema ("Precisa funcionar sem internet?" × "A internet costuma cair onde
# o sistema é usado?"). Não entende sinônimos ("usar" × "utilizar"): repetição com outras palavras fica para o prompt
# e para a avaliação (AV-ENT-*).
LIMITE_REPETICAO_PERGUNTA = 0.6
TAMANHO_RADICAL = 5

# Palavras que não distinguem uma pergunta de outra. "quem", "onde", "quando" e "quantas" ficam de fora desta lista
# de propósito: são o que diferencia "Quem vai usar?" de "Onde vai usar?".
_VAZIAS_PERGUNTA = frozenset({
    'que', 'qual', 'quais', 'como', 'para', 'com', 'uma', 'umas', 'uns', 'por', 'pelo', 'pela', 'pelos', 'pelas',
    'dos', 'das', 'nos', 'nas', 'num', 'numa', 'sao', 'ser', 'sera', 'serao', 'seria', 'vai', 'vao', 'voce', 'voces',
    'seu', 'sua', 'seus', 'suas', 'tem', 'ter', 'tera', 'precisa', 'precisam', 'precisaria', 'sistema', 'solucao',
    'aplicacao', 'programa', 'mais', 'menos', 'muito', 'muita', 'isso', 'esse', 'essa', 'este', 'esta', 'algum',
    'alguma', 'alguns', 'algumas', 'deve', 'devem', 'pode', 'podem', 'costuma', 'normalmente', 'geralmente',
    'hoje', 'dia', 'ainda', 'tambem', 'sobre', 'cada', 'entre', 'vez', 'vezes', 'precisar', 'existe', 'existem',
    'haver', 'havera',
})

# Rótulos/valores de opção que a interface já oferece. Comparação exata depois de normalizar: "Outro sistema que já
# usamos" NÃO é removido (só "Outro", "Outro: qual?", "Não sei", ...).
_ROTULOS_DA_INTERFACE = frozenset({
    'outro', 'outra', 'outros', 'outras', 'outro qual', 'outra qual', 'outros quais', 'outro especifique',
    'outra especifique', 'outra opcao', 'outra resposta', 'outro caso', 'outros casos', 'outro motivo',
    'nao sei', 'nao sei dizer', 'nao sei responder', 'nao tenho certeza', 'nao sei informar', 'prefiro nao responder',
    'nenhuma das anteriores', 'nenhuma das opcoes',
})
_VALORES_DA_INTERFACE = frozenset({'outro', 'outra', 'outros', 'nao_sei', 'naosei', 'nao_sabe', 'nao_tenho_certeza'})


def _normalizar(texto: str) -> str:
    return ' '.join(re.findall(r'[a-z0-9]+', sem_acento((texto or '').casefold())))


def slug(texto: str, padrao: str) -> str:
    """Identificador seguro: minúsculas sem acento, [a-z0-9_], até `TAMANHO_SLUG` caracteres."""
    valor = '_'.join(_normalizar(texto).split())[:TAMANHO_SLUG].strip('_')
    return valor or padrao


def _unico(base: str, usados: set[str]) -> str:
    valor, n = base, 2
    while valor in usados:
        sufixo = f'_{n}'
        valor = base[:TAMANHO_SLUG - len(sufixo)] + sufixo
        n += 1
    usados.add(valor)
    return valor


def radicais(texto: str) -> frozenset[str]:
    palavras = _normalizar(texto).split()
    return frozenset(p[:TAMANHO_RADICAL] for p in palavras
                     if len(p) >= 3 and not p.isdigit() and p not in _VAZIAS_PERGUNTA)


def similaridade_pergunta(a: str, b: str) -> float:
    ra, rb = radicais(a), radicais(b)
    if not ra or not rb:
        return 1.0 if _normalizar(a) == _normalizar(b) and _normalizar(a) else 0.0
    return len(ra & rb) / len(ra | rb)


def pergunta_repetida(enunciado: str, anteriores) -> str | None:
    """Primeira pergunta de `anteriores` igual ou parecida (≥ limite) com `enunciado`, senão None."""
    for anterior in anteriores:
        if similaridade_pergunta(enunciado, anterior or '') >= LIMITE_REPETICAO_PERGUNTA:
            return anterior
    return None


def eh_opcao_da_interface(opcao: dict) -> bool:
    return (_normalizar(opcao.get('rotulo', '')) in _ROTULOS_DA_INTERFACE
            or slug(opcao.get('valor', ''), '') in _VALORES_DA_INTERFACE)


def _opcoes(brutas) -> list[dict]:
    opcoes, valores, rotulos = [], set(), set()
    for opcao in brutas or ():
        if not isinstance(opcao, dict) or eh_opcao_da_interface(opcao):
            continue
        rotulo = (opcao.get('rotulo') or '').strip()
        chave_rotulo = _normalizar(rotulo)
        if not chave_rotulo or chave_rotulo in rotulos:
            continue
        rotulos.add(chave_rotulo)
        valor = _unico(slug(opcao.get('valor') or rotulo, 'opcao'), valores)
        opcoes.append({'valor': valor, 'rotulo': rotulo, 'sinais': filtrar_sinais(opcao.get('sinais'))})
    return opcoes[:MAX_OPCOES]


def ajustar_entrevista(entrada: dict, dados: dict) -> dict:
    """Aplica as regras acima. Não altera `dados` (devolve um dicionário novo)."""
    respondidas = [r for r in entrada.get('respostas') or () if isinstance(r, dict)]
    enunciados = [r.get('pergunta', '') for r in respondidas]
    ids_usados = {slug(r['id'], '') for r in respondidas if r.get('id')} - {''}

    perguntas: list[dict] = []
    for bruta in dados.get('perguntas') or ():
        if len(perguntas) >= MAX_PERGUNTAS:
            break
        enunciado = (bruta.get('enunciado') or '').strip()
        if not enunciado or pergunta_repetida(enunciado, enunciados):
            continue
        opcoes = _opcoes(bruta.get('opcoes'))
        if len(opcoes) < MIN_OPCOES:
            continue
        enunciados.append(enunciado)  # também evita duas perguntas parecidas na mesma rodada
        perguntas.append({
            'id': _unico(slug(bruta.get('id') or enunciado, 'pergunta'), ids_usados),
            'enunciado': enunciado,
            'ajuda': (bruta.get('ajuda') or '').strip(),
            'multipla': bool(bruta.get('multipla')),
            'opcoes': opcoes,
        })

    rodada = entrada.get('rodada') or 1
    maxima = entrada.get('rodadaMaxima')  # posto pelo serializer; sem ele, não força
    ultima = bool(maxima) and rodada >= maxima
    lacunas = list(dict.fromkeys(t.strip() for t in dados.get('lacunas') or () if isinstance(t, str) and t.strip()))
    return {
        'perguntas': perguntas,
        'suficiente': bool(dados.get('suficiente')) or ultima or not perguntas,
        'resumo': (dados.get('resumo') or '').strip(),
        'lacunas': lacunas[:MAX_LACUNAS],
    }
