"""Adaptador falso: determinístico, sem internet e sem custo. Usado em testes e na demonstração offline.

Para tarefas conhecidas monta uma resposta coerente com a entrada; para as demais, gera o mínimo válido
a partir do próprio esquema.
"""
from __future__ import annotations

import hashlib
import re

from apps.cenario.domain.sinais import descricao as descricao_sinal
from apps.ia.domain.entrevista import pergunta_repetida
from apps.ia.domain.ports import LLMProvider, ResultadoGeracao
from apps.ia.domain.texto import (LIMITE_REPETICAO_CAUSA, LIMITE_REPETICAO_TITULO, palavras, parecido_com_algum,
                                  sem_acento)

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


# ---------- entrevista ----------
# Roteiro fixo no espírito do BANCO do front (frontend/src/app/core/api/mock-ia.ts), agora com sinais do catálogo.
# Cada item: id, enunciado, ajuda, multipla, opções (valor, rótulo, sinais), condições (`com`: algum destes sinais
# precisa ter aparecido; `sem`: nenhum destes pode ter aparecido) e a pergunta de aprofundamento usada quando o
# cliente respondeu "Não sei".
_ROTEIRO = (
    {'id': 'usuarios', 'enunciado': 'Quem vai usar o sistema no dia a dia?', 'multipla': True,
     'ajuda': 'Saber quem usa ajuda a escolher entre site, programa no computador ou aplicativo.',
     'opcoes': [('so_eu', 'Só eu', ['USO_INDIVIDUAL']), ('equipe', 'Uma equipe interna', ['EQUIPE_INTERNA']),
                ('externos', 'Clientes ou pacientes', ['PUBLICO_EXTERNO']),
                ('ninguem', 'Ninguém, ele roda sozinho', ['SEM_OPERADOR'])],
     'aprofundar': 'Além da sua equipe, pessoas de fora da empresa também vão abrir o sistema?'},
    {'id': 'onde', 'enunciado': 'Onde as pessoas vão usar?', 'multipla': False, 'sem': ['SEM_OPERADOR'],
     'ajuda': 'O lugar e o aparelho mudam o tipo de solução.',
     'opcoes': [('computador', 'No computador do escritório', ['USO_COMPUTADOR']),
                ('celular', 'No celular', ['USO_CELULAR']),
                ('ambos', 'No computador e no celular', ['USO_MULTIPLATAFORMA']),
                ('campo', 'Na rua, em campo', ['USO_EM_CAMPO'])],
     'aprofundar': 'Na maior parte do tempo, a pessoa trabalha sentada numa mesa ou andando?'},
    {'id': 'internet', 'enunciado': 'Precisa funcionar sem internet?', 'multipla': False, 'sem': ['SEM_OPERADOR'],
     'ajuda': 'Se a internet faltar, algumas soluções param de funcionar.',
     'opcoes': [('sempre', 'Sim, precisa funcionar sempre', ['PRECISA_OFFLINE']),
                ('as_vezes', 'Às vezes a internet cai', ['INTERNET_INSTAVEL']),
                ('nao', 'Não, sempre haverá internet', ['INTERNET_DISPONIVEL'])],
     'aprofundar': 'Nos lugares onde o trabalho acontece, a conexão costuma cair?'},
    {'id': 'frequencia', 'enunciado': 'Com que frequência a tarefa acontece?', 'multipla': False,
     'ajuda': 'Tarefas em horário fixo podem rodar sozinhas, sem ninguém apertar botão.',
     'opcoes': [('continuo', 'O tempo todo, ao longo do dia', ['USO_CONTINUO']),
                ('diario', 'Uma vez por dia, em horário fixo', ['EXECUCAO_AGENDADA']),
                ('periodico', 'De vez em quando, em datas fixas', ['EXECUCAO_PERIODICA']),
                ('sob_demanda', 'Quando alguém pede', ['SOB_DEMANDA'])],
     'aprofundar': 'Essa tarefa tem dia ou horário certo para acontecer?'},
    {'id': 'integracao', 'enunciado': 'Precisa conversar com algum sistema que vocês já usam?', 'multipla': False,
     'ajuda': 'Trocar informações com outro sistema evita digitar a mesma coisa duas vezes.',
     'opcoes': [('busca', 'Sim, precisa buscar informações de outro sistema', ['INTEGRA_SISTEMA']),
                ('envia', 'Sim, precisa enviar informações para outro sistema', ['INTEGRA_SISTEMA']),
                ('nao', 'Não, funciona sozinho', [])],
     'aprofundar': 'Hoje vocês copiam informações de um programa para outro à mão?'},
    {'id': 'perifericos', 'enunciado': 'Vai usar algum equipamento ligado ao computador?', 'multipla': True,
     'com': ['USO_COMPUTADOR'], 'ajuda': 'Leitores e impressoras pedem um programa instalado no computador.',
     'opcoes': [('leitor', 'Leitor de código de barras', ['PERIFERICOS_LOCAIS']),
                ('impressora', 'Impressora de etiquetas', ['PERIFERICOS_LOCAIS']),
                ('nenhum', 'Nenhum equipamento', ['SEM_PERIFERICOS'])]},
    {'id': 'localizacao', 'enunciado': 'Precisa saber onde a pessoa está quando usa?', 'multipla': False,
     'com': ['USO_CELULAR', 'USO_EM_CAMPO'], 'ajuda': 'A localização funciona melhor em aplicativo de celular.',
     'opcoes': [('sim', 'Sim, a localização é importante', ['LOCALIZACAO']),
                ('registro', 'Só para registrar onde a tarefa foi feita', ['LOCALIZACAO']),
                ('nao', 'Não precisa', [])]},
    {'id': 'resultado', 'enunciado': 'O que deve acontecer no final?', 'multipla': False, 'com': ['SEM_OPERADOR'],
     'ajuda': 'Diz para onde vai o que a rotina produzir.',
     'opcoes': [('email', 'Enviar um relatório por e-mail', ['RESULTADO_EMAIL']),
                ('arquivo', 'Gerar um arquivo em uma pasta', ['RESULTADO_ARQUIVO']),
                ('outro_sistema', 'Atualizar outro sistema', ['RESULTADO_OUTRO_SISTEMA'])]},
    {'id': 'volume', 'enunciado': 'Quantas pessoas usariam ao mesmo tempo, mais ou menos?', 'multipla': False,
     'com': ['EQUIPE_INTERNA', 'PUBLICO_EXTERNO'], 'ajuda': 'Muita gente ao mesmo tempo pede uma solução mais robusta.',
     'opcoes': [('poucos', 'Até 10', ['POUCOS_USUARIOS']), ('medio', 'Entre 10 e 100', ['DEZENAS_USUARIOS']),
                ('muitos', 'Mais de 100', ['MUITOS_USUARIOS'])]},
    {'id': 'aprovacao', 'enunciado': 'Alguém precisa conferir ou aprovar antes de a tarefa terminar?',
     'multipla': False, 'ajuda': 'Ajuda a definir quem faz cada passo.',
     'opcoes': [('direto', 'Não, quem faz já conclui', []), ('responsavel', 'Sim, um responsável aprova', []),
                ('varios', 'Sim, passa por mais de uma pessoa', [])]},
    {'id': 'avisos', 'enunciado': 'Quem precisa ser avisado quando algo muda?', 'multipla': True,
     'ajuda': 'Avisos certos evitam que alguém perca um prazo.',
     'opcoes': [('quem_pediu', 'Quem fez o pedido', []), ('responsavel', 'O responsável pela tarefa', []),
                ('ninguem', 'Ninguém precisa ser avisado', [])]},
)
_ESSENCIAIS = ('usuarios', 'onde', 'internet', 'frequencia', 'integracao')

# Trechos da necessidade que já respondem uma pergunta do roteiro (o fake não pergunta de novo o que já foi dito).
_DITO_NA_NECESSIDADE = (
    (('celular', 'smartphone', 'aplicativo'), 'onde', ['USO_CELULAR']),
    (('na rua', 'em campo', 'entregador', 'motorista'), 'onde', ['USO_EM_CAMPO']),
    (('sem internet', 'offline', 'sem sinal'), 'internet', ['PRECISA_OFFLINE']),
    (('madrugada', 'todo dia', 'todos os dias', 'diariamente', 'noturno'), 'frequencia', ['EXECUCAO_AGENDADA']),
)


def _ja_dito(texto: str) -> tuple[set[str], set[str]]:
    normal = sem_acento(texto.casefold())
    cobertas, sinais = set(), set()
    for termos, pergunta, marcados in _DITO_NA_NECESSIDADE:
        if any(sem_acento(t) in normal for t in termos):
            cobertas.add(pergunta)
            sinais.update(marcados)
    return cobertas, sinais


def _item_do_roteiro(resposta: dict) -> dict | None:
    pergunta = resposta.get('pergunta', '')
    pid = (resposta.get('id') or '').removesuffix('_detalhe')
    return next((p for p in _ROTEIRO if p['id'] == pid), None) or next(
        (p for p in _ROTEIRO if pergunta_repetida(pergunta, [p['enunciado'], p.get('aprofundar', '')])), None)


def _entrevista(entrada: dict) -> dict:
    demanda = entrada.get('demanda') or {}
    respostas = entrada.get('respostas') or []
    rodada = entrada.get('rodada') or 1
    ultima = rodada >= (entrada.get('rodadaMaxima') or 3)
    cobertas, sinais = _ja_dito(' '.join([*(demanda.get('necessidade') or []), demanda.get('descricao') or '']))

    respondidas, nao_sei = set(), []
    for r in respostas:
        item = _item_do_roteiro(r)
        if item is None:
            continue
        if r.get('naoSei') and not r.get('respostas') and item['id'] not in respondidas:
            nao_sei.append(item)
        respondidas.add(item['id'])
        rotulos = {x.casefold() for x in r.get('respostas') or []}
        sinais.update(s for _, rotulo, marcados in item['opcoes'] if rotulo.casefold() in rotulos for s in marcados)
    aprofundadas = {(r.get('id') or '').removesuffix('_detalhe') for r in respostas if (r.get('id') or '').endswith('_detalhe')}

    def aplica(p):
        return not (p.get('sem') and sinais & set(p['sem'])) and (not p.get('com') or bool(sinais & set(p['com'])))

    def montar(p, enunciado=None, sufixo=''):
        return {'id': p['id'] + sufixo, 'enunciado': enunciado or p['enunciado'], 'ajuda': p['ajuda'],
                'multipla': p['multipla'],
                'opcoes': [{'valor': v, 'rotulo': rot, 'sinais': list(si)} for v, rot, si in p['opcoes']]}

    abertas = [p for p in _ROTEIRO if p['id'] not in respondidas | cobertas and aplica(p)]
    da_rodada = [p for p in abertas if p['id'] in _ESSENCIAIS] if rodada == 1 else abertas
    perguntas = [montar(p, p['aprofundar'], '_detalhe') for p in nao_sei
                 if rodada > 1 and p.get('aprofundar') and p['id'] not in aprofundadas]
    perguntas = (perguntas + [montar(p) for p in da_rodada])[:2 if ultima else 5]
    entendido = ', '.join(descricao_sinal(x).lower() for x in sorted(sinais)) or 'ainda pouco sobre o uso'
    pendentes = [p['enunciado'] for p in abertas if p['id'] not in {q['id'] for q in perguntas}]
    return {
        'perguntas': perguntas,
        'suficiente': ultima or not perguntas,
        'resumo': f'{len(respostas)} resposta(s) registrada(s). Já entendemos: {entendido}.'[:400],
        'lacunas': [t[:120] for t in pendentes][:5],
    }


_GERADORES = {'requisitos': _requisitos, 'sugestao_suporte': _sugestao, 'entrevista': _entrevista}


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
