"""Prompts v1 das tarefas `requisitos` e `sugestao_suporte`.

Texto e esquema ficam congelados aqui (a migração não importa código do app). Para mudar, crie a v2
(admin ou nova migração) e ative-a; a v1 continua no banco para rastrear o LogIA antigo.
Os esquemas seguem o modo estrito (todas as propriedades obrigatórias, additionalProperties false),
aceito tanto pelo Gemini (`responseJsonSchema`) quanto pelo OpenAI (`json_schema` strict).
"""
from django.db import migrations

REQUISITOS_TEXTO = """Você é analista de requisitos do NEXUS. Proponha de 3 a 12 requisitos usando SOMENTE os dados de entrada: descrição da demanda, necessidade informada pelo cliente e respostas da entrevista.
Regras:
- Português do Brasil, linguagem simples, sem jargão técnico.
- tipo: RF (o que o sistema faz), RNF (qualidade: segurança, desempenho, usabilidade, disponibilidade) ou REGRA (regra de negócio).
- Cada requisito deve ser verificável: título curto (até 12 palavras) e descrição de 1 a 3 frases que permita testar se foi atendido.
- Não invente números, prazos, nomes, integrações ou dados que não estejam na entrada. Se algo estiver incerto, diga isso na descrição.
- Não repita nenhum item de requisitosAprovados.
- Marcadores como [PESSOA_1] ou [EMAIL_1] substituem dados pessoais: mantenha-os exatamente como estão.
- Você apenas propõe; uma pessoa da equipe vai validar cada requisito."""

REQUISITOS_SCHEMA = {
    'type': 'object',
    'properties': {
        'requisitos': {
            'type': 'array',
            'minItems': 3,
            'maxItems': 12,
            'items': {
                'type': 'object',
                'properties': {
                    'tipo': {'type': 'string', 'enum': ['RF', 'RNF', 'REGRA']},
                    'titulo': {'type': 'string'},
                    'descricao': {'type': 'string'},
                },
                'required': ['tipo', 'titulo', 'descricao'],
                'additionalProperties': False,
            },
        },
    },
    'required': ['requisitos'],
    'additionalProperties': False,
}

SUGESTAO_TEXTO = """Você apoia o atendimento de suporte do NEXUS. Use SOMENTE o chamado e o contexto recebido (solução/versão, requisitos, conhecimentos validados e chamados resolvidos).
Responda com:
- categoria: classificação curta do problema (ex.: Autenticação, Desempenho, Dados, Interface, Integração, Outro).
- causa: possível causa escrita SEMPRE como hipótese, começando por "Possível causa:". Nunca afirme diagnóstico confirmado.
- procedimento: de 2 a 8 passos simples de verificação ou correção para uma pessoa executar. Você não executa nada; não sugira comandos que apaguem ou alterem dados sem conferência.
- confianca: de 0 a 1; baixa quando houver pouco contexto.
- conhecimentoUsado: o código KB-... de um conhecimento da entrada SOMENTE se ele realmente se aplicar a este chamado; caso contrário, null.
- semHistorico: true quando nenhum conhecimento ou chamado resolvido da entrada se aplicar.
Não invente códigos, versões ou dados que não estejam na entrada. Marcadores como [PESSOA_1] substituem dados pessoais: mantenha-os. Uma pessoa vai validar a sugestão."""

SUGESTAO_SCHEMA = {
    'type': 'object',
    'properties': {
        'categoria': {'type': 'string'},
        'causa': {'type': 'string'},
        'procedimento': {'type': 'array', 'minItems': 2, 'maxItems': 8, 'items': {'type': 'string'}},
        'confianca': {'type': 'number', 'minimum': 0, 'maximum': 1},
        'conhecimentoUsado': {'type': ['string', 'null']},
        'semHistorico': {'type': 'boolean'},
    },
    'required': ['categoria', 'causa', 'procedimento', 'confianca', 'conhecimentoUsado', 'semHistorico'],
    'additionalProperties': False,
}

PROMPTS = (
    ('requisitos', REQUISITOS_TEXTO, REQUISITOS_SCHEMA),
    ('sugestao_suporte', SUGESTAO_TEXTO, SUGESTAO_SCHEMA),
)


def criar(apps, schema_editor):
    PromptTemplate = apps.get_model('ia', 'PromptTemplate')
    for chave, texto, schema in PROMPTS:
        PromptTemplate.objects.update_or_create(
            chave=chave, versao=1, defaults={'texto': texto, 'schema_json': schema, 'ativo': True},
        )


def remover(apps, schema_editor):
    apps.get_model('ia', 'PromptTemplate').objects.filter(versao=1, chave__in=[p[0] for p in PROMPTS]).delete()


class Migration(migrations.Migration):
    dependencies = [('ia', '0001_initial')]
    operations = [migrations.RunPython(criar, remover)]
