"""Prompt v2 de `entrevista`: esquema sem `enum` nos sinais (o Gemini recusava a v1 com HTTP 400).

Medido em 2026-11-03 (5 casos AV-ENT + 4 chamadas de diagnóstico, gemini-3.5-flash-lite, `responseJsonSchema`):
- esquema v1 completo → 400 "Request contains an invalid argument" em todas as chamadas (falha definitiva: a cadeia
  de reserva nem é tentada);
- v1 sem o `enum` dos sinais → OK; v1 sem nenhum limite (minItems/maxItems/maxLength) mas com o `enum` → OK;
- v1 sem só o `maxItems` da lista de sinais → 400.
Ou seja, o provedor recusa a COMBINAÇÃO de um `enum` de 27 valores dentro de listas aninhadas com os limites de
tamanho/quantidade (complexidade do esquema). Entre perder o `enum` e perder os limites, perder o `enum` é o modo de
falha mais barato: sinal fora do catálogo é só descartado pelo pós-processamento (`apps/ia/domain/entrevista.py`),
enquanto texto/lista acima do limite derruba a tentativa inteira (fora do esquema → próxima reserva).

O catálogo continua garantido por: (1) lista no texto do prompt, (2) filtro determinístico, (3) critério
"sinais só do catálogo (modelo)" na avaliação. Texto = v1 com uma frase a mais sobre os códigos. v1 preservada e
desativada. Texto e esquema derivados da v1 congelada em 0007 (nada do código do app é importado).
"""
import copy

from django.db import migrations

FRASE_V1 = '- sinais: códigos do catálogo abaixo que a opção indica, só quando ela realmente indica (lista vazia se nenhum se aplicar). Não invente códigos.'
FRASE_V2 = ('- sinais: códigos do catálogo abaixo que a opção indica, só quando ela realmente indica (lista vazia se nenhum '
            'se aplicar). Use SOMENTE estes códigos, escritos exatamente como estão (maiúsculas e sublinhado); código '
            'fora do catálogo é descartado. No máximo 4 por opção.')


def criar_v2(apps, schema_editor):
    PromptTemplate = apps.get_model('ia', 'PromptTemplate')
    v1 = PromptTemplate.objects.get(chave='entrevista', versao=1)
    if FRASE_V1 not in v1.texto:
        raise RuntimeError('Texto da v1 de entrevista diferente do esperado.')
    schema = copy.deepcopy(v1.schema_json)
    schema['properties']['perguntas']['items']['properties']['opcoes']['items']['properties']['sinais']['items'] = {
        'type': 'string'}
    PromptTemplate.objects.filter(chave='entrevista', ativo=True).update(ativo=False)
    PromptTemplate.objects.update_or_create(
        chave='entrevista', versao=2,
        defaults={'texto': v1.texto.replace(FRASE_V1, FRASE_V2), 'schema_json': schema, 'ativo': True},
    )


def voltar_v1(apps, schema_editor):
    PromptTemplate = apps.get_model('ia', 'PromptTemplate')
    PromptTemplate.objects.filter(chave='entrevista', versao=2).delete()  # PROTECT se houver LogIA da v2
    PromptTemplate.objects.filter(chave='entrevista', versao=1).update(ativo=True)


class Migration(migrations.Migration):
    dependencies = [('ia', '0007_prompt_entrevista_v1')]
    operations = [migrations.RunPython(criar_v2, voltar_v1)]
