"""Validador mínimo de JSON Schema para as respostas da IA. Resposta fora do esquema = falha.

Suporta: type (string ou lista), properties, required, additionalProperties false, items, enum,
minItems/maxItems, minimum/maximum, minLength/maxLength.
"""
from __future__ import annotations

_TIPOS = {
    'object': lambda v: isinstance(v, dict),
    'array': lambda v: isinstance(v, list),
    'string': lambda v: isinstance(v, str),
    'number': lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    'integer': lambda v: isinstance(v, int) and not isinstance(v, bool),
    'boolean': lambda v: isinstance(v, bool),
    'null': lambda v: v is None,
}


class ErroEsquema(ValueError):
    def __init__(self, erros: list[str]):
        super().__init__('; '.join(erros))
        self.erros = erros


def validar(dado, schema: dict, caminho: str = '$') -> list[str]:
    """Lista de erros (vazia quando válido). `caminho` indica onde está o problema."""
    erros: list[str] = []
    tipos = schema.get('type')
    if tipos is not None:
        tipos = [tipos] if isinstance(tipos, str) else list(tipos)
        if not any(_TIPOS[t](dado) for t in tipos):
            return [f'{caminho}: esperado {"/".join(tipos)}']

    if 'enum' in schema and dado not in schema['enum']:
        erros.append(f'{caminho}: valor fora da lista permitida')

    if isinstance(dado, dict):
        propriedades = schema.get('properties', {})
        for campo in schema.get('required', []):
            if campo not in dado:
                erros.append(f'{caminho}.{campo}: obrigatório')
        if schema.get('additionalProperties') is False:
            erros += [f'{caminho}.{campo}: não permitido' for campo in dado if campo not in propriedades]
        for campo, sub in propriedades.items():
            if campo in dado:
                erros += validar(dado[campo], sub, f'{caminho}.{campo}')

    elif isinstance(dado, list):
        if 'minItems' in schema and len(dado) < schema['minItems']:
            erros.append(f'{caminho}: mínimo de {schema["minItems"]} itens')
        if 'maxItems' in schema and len(dado) > schema['maxItems']:
            erros.append(f'{caminho}: máximo de {schema["maxItems"]} itens')
        if 'items' in schema:
            for i, item in enumerate(dado):
                erros += validar(item, schema['items'], f'{caminho}[{i}]')

    elif isinstance(dado, str):
        if 'minLength' in schema and len(dado) < schema['minLength']:
            erros.append(f'{caminho}: texto curto demais')
        if 'maxLength' in schema and len(dado) > schema['maxLength']:
            erros.append(f'{caminho}: texto longo demais')

    elif _TIPOS['number'](dado):
        if 'minimum' in schema and dado < schema['minimum']:
            erros.append(f'{caminho}: menor que {schema["minimum"]}')
        if 'maximum' in schema and dado > schema['maximum']:
            erros.append(f'{caminho}: maior que {schema["maximum"]}')

    return erros


def exigir_valido(dado, schema: dict) -> None:
    erros = validar(dado, schema)
    if erros:
        raise ErroEsquema(erros)
