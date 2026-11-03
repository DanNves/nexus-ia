"""Prompt v3 de `entrevista`: aproveitar cada rodada (cada uma custa uma chamada).

Avaliação real da v2 (2026-11-03, 5 casos AV-ENT, gemini-3.5-flash-lite, `claude/ia.md`): 5/5 nos critérios
originais, mas na leitura humana a rodada 1 trouxe só 2, 2 e 1 perguntas (AV-ENT-01, 03, 05) enquanto `lacunas`
listava assuntos da prioridade 1 que cabiam na mesma rodada (internet, outro sistema, avisos). Com no máximo 3 rodadas,
isso gasta cota e deixa o cenário com poucos sinais. A causa provável é "com o menor número possível de perguntas",
lido como "pergunte pouco por rodada". Também: opções sobrepostas em escolha única ("Apenas uma pessoa por vez" ×
"Até 10 pessoas", AV-ENT-02).

Mudanças (o resto é igual à v2; esquema = v2):
- objetivo: poucas RODADAS, não poucas perguntas; o que cabe na rodada vira pergunta agora;
- rodada 1: tudo da prioridade 1 em aberto (normalmente 4 ou 5 perguntas);
- exemplo de faixas que não se sobrepõem;
- `lacunas` = o que falta e não coube nesta rodada.
Derivada da v2 (0008), que é derivada da v1 congelada (0007). v2 preservada e desativada.
"""
from django.db import migrations

TROCAS = (
    ('Objetivo: descobrir, com o menor número possível de perguntas, o que ainda falta para (1) escolher o tipo de '
     'solução e (2) escrever os requisitos.',
     'Objetivo: descobrir, em poucas rodadas (no máximo rodadaMaxima), o que ainda falta para (1) escolher o tipo de '
     'solução e (2) escrever os requisitos. Cada rodada custa uma chamada: aproveite-a. Pergunte NESTA rodada tudo o '
     'que estiver em aberto e for relevante, até 5 perguntas; se um ponto que falta cabe na rodada, transforme-o em '
     'pergunta agora em vez de deixá-lo para depois.'),
    ('- Rodada 1: cubra o essencial da prioridade 1 que ainda estiver em aberto.',
     '- Rodada 1: cubra de uma vez tudo da prioridade 1 que ainda estiver em aberto (normalmente 4 ou 5 perguntas); '
     'se sobrar espaço, comece a prioridade 2.'),
    ('Com multipla=false as opções não podem se sobrepor: uma exclui a outra.',
     'Com multipla=false as opções não podem se sobrepor: uma exclui a outra (ex.: "Só uma pessoa" e "Até 10 pessoas" '
     'se sobrepõem; use faixas como "1 pessoa", "De 2 a 10", "Mais de 10").'),
    ('lacunas: até 5 pontos curtos que ainda faltam saber (vazia se nada faltar).',
     'lacunas: até 5 pontos curtos que ainda faltam saber e que não couberam nesta rodada (vazia se nada faltar).'),
)


def criar_v3(apps, schema_editor):
    PromptTemplate = apps.get_model('ia', 'PromptTemplate')
    v2 = PromptTemplate.objects.get(chave='entrevista', versao=2)
    texto = v2.texto
    for antigo, novo in TROCAS:
        if antigo not in texto:
            raise RuntimeError(f'Texto da v2 de entrevista diferente do esperado: {antigo[:40]}…')
        texto = texto.replace(antigo, novo)
    PromptTemplate.objects.filter(chave='entrevista', ativo=True).update(ativo=False)
    PromptTemplate.objects.update_or_create(
        chave='entrevista', versao=3, defaults={'texto': texto, 'schema_json': v2.schema_json, 'ativo': True},
    )


def voltar_v2(apps, schema_editor):
    PromptTemplate = apps.get_model('ia', 'PromptTemplate')
    PromptTemplate.objects.filter(chave='entrevista', versao=3).delete()  # PROTECT se houver LogIA da v3
    PromptTemplate.objects.filter(chave='entrevista', versao=2).update(ativo=True)


class Migration(migrations.Migration):
    dependencies = [('ia', '0008_prompt_entrevista_v2_sem_enum')]
    operations = [migrations.RunPython(criar_v3, voltar_v2)]
