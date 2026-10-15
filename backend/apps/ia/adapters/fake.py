"""Adaptador falso: determinístico, sem internet e sem custo. Usado em testes e na demonstração offline.

Para tarefas conhecidas monta uma resposta coerente com a entrada; para as demais, gera o mínimo válido
a partir do próprio esquema.
"""
from __future__ import annotations

import hashlib
import re

from apps.ia.domain.ports import LLMProvider, ResultadoGeracao
from apps.ia.domain.texto import LIMITE_REPETICAO_CAUSA, LIMITE_REPETICAO_TITULO, palavras, parecido_com_algum

MODELO_FAKE = 'nexus-fake-1'


class FakeProvider(LLMProvider):
    nome = 'fake'
    real = False

    def __init__(self, modelos=(MODELO_FAKE,)):
        super().__init__(modelos)

    def gerar_estruturado(self, prompt, schema, contexto, *, modelo=None, parametros=None) -> ResultadoGeracao:
        entrada = contexto.get('entrada') or {}
        gerador = _GERADORES.get(contexto.get('tarefa'))
        dados = gerador(entrada) if gerador else _minimo_do_esquema(schema)
        return ResultadoGeracao(dados=dados, modelo=modelo or self.modelos[0], duracao_ms=1)

    def embedding(self, texto: str) -> list[float]:
        resumo = hashlib.sha256(texto.encode('utf-8')).digest()
        return [b / 255 for b in resumo[:16]]


def _requisitos(entrada: dict) -> dict:
    demanda = entrada.get('demanda') or {}
    nome = demanda.get('nome') or 'a solução'
    aprovados = {r.get('titulo', '').casefold() for r in entrada.get('requisitosAprovados', [])}
    rejeitados = [r.get('titulo', '') for r in entrada.get('requisitosRejeitados', [])]
    candidatos = [
        ('RF', 'Cadastrar e consultar registros', f'O sistema deve permitir cadastrar, editar e consultar os registros de {nome}.'),
        ('RF', 'Acompanhar o andamento', 'O usuário deve ver em que situação cada registro está e quando mudou.'),
        ('RF', 'Notificar mudanças importantes', 'O sistema deve avisar os envolvidos quando um registro mudar de situação.'),
        ('RNF', 'Acesso com usuário e senha', 'Somente pessoas autenticadas podem acessar os dados; cada uma vê só o que é seu.'),
        ('RNF', 'Uso em computador e celular', 'As telas principais devem funcionar em navegador de computador e de celular.'),
        ('REGRA', 'Registro de quem alterou', 'Toda alteração deve guardar quem fez e quando, para consulta posterior.'),
        ('RF', 'Pesquisar por filtros', f'O usuário deve encontrar registros de {nome} filtrando por situação e período.'),
        ('RNF', 'Telas simples de usar', 'As tarefas principais devem ser concluídas sem treinamento, em poucos passos.'),
    ]
    todos = [{'tipo': t, 'titulo': ti, 'descricao': d} for t, ti, d in candidatos]
    # Rejeitado nunca volta; aprovado não se repete. O fake não lê o motivo, então é conservador: descarta o
    # candidato que tenha qualquer palavra de conteúdo em comum com um título rejeitado.
    palavras_rejeitadas = frozenset().union(*(palavras(t) for t in rejeitados))
    permitidos = [r for r in todos if not (palavras(r['titulo']) & palavras_rejeitadas)
                  and not parecido_com_algum(r['titulo'], rejeitados, LIMITE_REPETICAO_TITULO)]
    novos = [r for r in permitidos if r['titulo'].casefold() not in aprovados]
    return {'requisitos': novos if len(novos) >= 3 else permitidos[:3]}


def _palavras(texto: str) -> set[str]:
    return {p for p in re.findall(r'\w+', (texto or '').casefold()) if len(p) >= 5 and not p.isdigit()}


def _conhecimento_relacionado(chamado: dict, conhecimentos: list[dict]) -> dict | None:
    """Primeiro conhecimento cujo título compartilha 2+ palavras (5+ letras) com o título/descrição do chamado.

    Uma palavra só ("relatório") não basta: "Relatório lento com grande volume" não explica "totais em branco".
    """
    palavras = _palavras(f'{chamado.get("titulo", "")} {chamado.get("descricao", "")}')
    return next((kb for kb in conhecimentos if len(palavras & _palavras(kb.get('titulo', ''))) >= 2), None)


_CAUSAS_GENERICAS = (
    'ainda não identificada; não há conhecimento validado parecido com este chamado.',
    'mudança recente de configuração ou de versão no ambiente em que o problema aparece.',
    'dados de entrada fora do padrão esperado pela funcionalidade afetada.',
)


def _sugestao(entrada: dict) -> dict:
    conhecimentos = entrada.get('conhecimentos') or []
    resolvidos = entrada.get('chamadosResolvidos') or []
    rejeitadas = [s.get('causa', '') for s in entrada.get('sugestoesRejeitadas', [])]
    sufixo = ' É uma hipótese diferente das já descartadas neste chamado.' if rejeitadas else ''

    def repetida(causa: str) -> bool:
        return parecido_com_algum(causa, rejeitadas, LIMITE_REPETICAO_CAUSA) is not None

    kb = _conhecimento_relacionado(entrada.get('chamado') or {}, conhecimentos)
    causa_kb = kb and f'Possível causa: o mesmo problema descrito em {kb.get("codigo")} ({kb.get("titulo")}).'
    if kb and not repetida(causa_kb):
        passos = [p for p in kb.get('procedimento', []) if p][:8]
        while len(passos) < 2:
            passos.append('Confirmar com o solicitante se o problema foi resolvido.')
        return {
            'categoria': 'Recorrência conhecida',
            'causa': causa_kb + sufixo,
            'procedimento': passos,
            'confianca': 0.72,
            'conhecimentoUsado': kb.get('codigo'),
            'semHistorico': False,
        }
    causa = next((f'Possível causa: {c}' for c in _CAUSAS_GENERICAS if not repetida(f'Possível causa: {c}')),
                 'Possível causa: nenhuma nova hipótese clara no contexto recebido; é preciso coletar mais dados.')
    return {
        'categoria': 'Análise inicial',
        'causa': causa + sufixo,
        'procedimento': [
            'Reproduzir o problema com o solicitante e anotar os passos.',
            'Verificar a versão em uso e as mudanças recentes.',
            'Registrar o que foi encontrado no chamado.',
        ],
        'confianca': 0.3 if rejeitadas else 0.35,
        'conhecimentoUsado': None,
        'semHistorico': not resolvidos,
    }


_GERADORES = {'requisitos': _requisitos, 'sugestao_suporte': _sugestao}


def _minimo_do_esquema(schema: dict):
    tipo = schema.get('type')
    tipo = tipo[0] if isinstance(tipo, list) else tipo
    if 'enum' in schema:
        return schema['enum'][0]
    if tipo == 'object':
        return {campo: _minimo_do_esquema(sub) for campo, sub in schema.get('properties', {}).items()}
    if tipo == 'array':
        return [_minimo_do_esquema(schema.get('items', {})) for _ in range(schema.get('minItems', 1))]
    if tipo in ('number', 'integer'):
        return schema.get('minimum', 0)
    if tipo == 'boolean':
        return False
    if tipo == 'null':
        return None
    return 'exemplo'


def criar(config) -> FakeProvider:
    return FakeProvider()
