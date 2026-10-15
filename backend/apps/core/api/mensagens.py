"""Troca as mensagens PADRÃO do DRF por português claro (defeito 6 do QA).

A tradução pt-BR do DRF tem frases como "Este campo pode não ser nulo." (sentido trocado).
Aqui cada mensagem padrão é reconhecida pelo texto — o msgid em inglês e a tradução do idioma
ativo, com os parâmetros ({max_length} etc.) — e substituída. Por isso funciona também com
mensagens já convertidas em texto (ex.: `ErroNegocio.campos` montado a partir de `exc.detail`).
Mensagens personalizadas dos serializers não batem com nenhum modelo e ficam como estão.
"""
import re
from functools import lru_cache

from django.utils import translation

VAZIO = 'Este campo não pode ficar vazio.'
OBJETO = 'Formato inválido: era esperado um objeto.'
NAO_ENCONTRADO = 'Registro não encontrado.'

# msgid do DRF (inglês, fonte estável) → mensagem clara. Placeholders iguais aos do msgid.
MENSAGENS_PADRAO = {
    'This field is required.': 'Este campo é obrigatório.',
    'This field may not be null.': VAZIO,
    'This field may not be blank.': VAZIO,
    'This dictionary may not be empty.': VAZIO,
    'This list may not be empty.': 'Informe pelo menos um item.',
    'This selection may not be empty.': 'Escolha pelo menos uma opção.',
    'No file was submitted.': 'Envie um arquivo.',
    'The submitted file is empty.': 'O arquivo enviado está vazio.',
    'Not a valid string.': 'Informe um texto.',
    'Enter a valid email address.': 'Informe um e-mail válido.',
    'Enter a valid URL.': 'Informe um endereço (URL) válido.',
    'Must be a valid UUID.': 'Informe um identificador válido.',
    'Must be a valid boolean.': 'Informe verdadeiro ou falso.',
    'A valid integer is required.': 'Informe um número inteiro.',
    'A valid biginteger is required.': 'Informe um número inteiro.',
    'A valid number is required.': 'Informe um número.',
    'Value must be valid JSON.': 'Formato inválido.',
    'String value too large.': 'Valor grande demais.',
    'Integer value too large to convert to float': 'Número grande demais.',
    'This value does not match the required pattern.': 'Valor em formato inválido.',
    'Invalid data. Expected a dictionary, but got {datatype}.': OBJETO,
    'Expected a dictionary of items but got type "{input_type}".': OBJETO,
    'Expected a list of items but got type "{input_type}".': 'Formato inválido: era esperada uma lista.',
    '"{input}" is not a valid choice.': '"{input}" não é uma opção válida.',
    'Ensure this field has no more than {max_length} characters.': 'Use no máximo {max_length} caracteres.',
    'Ensure this field has at least {min_length} characters.': 'Use pelo menos {min_length} caracteres.',
    'Ensure this field has no more than {max_length} elements.': 'Informe no máximo {max_length} itens.',
    'Ensure this field has at least {min_length} elements.': 'Informe pelo menos {min_length} itens.',
    'Ensure this value is less than or equal to {max_value}.': 'Informe um valor menor ou igual a {max_value}.',
    'Ensure this value is greater than or equal to {min_value}.': 'Informe um valor maior ou igual a {min_value}.',
    'Date has wrong format. Use one of these formats instead: {format}.': 'Informe uma data válida.',
    'Datetime has wrong format. Use one of these formats instead: {format}.': 'Informe data e hora válidas.',
    'Time has wrong format. Use one of these formats instead: {format}.': 'Informe um horário válido.',
    'Invalid pk "{pk_value}" - object does not exist.': NAO_ENCONTRADO,
    'Object with {slug_name}={value} does not exist.': NAO_ENCONTRADO,
    'Incorrect type. Expected pk value, received {data_type}.': 'Informe um identificador válido.',
}

_PLACEHOLDER = re.compile(r'\\\{(\w+)\\\}')


def _padrao(modelo: str) -> re.Pattern:
    """'Use {n} letras.' → regex que reconhece a frase com qualquer valor no lugar de {n}."""
    return re.compile(_PLACEHOLDER.sub(r'(?P<\1>.+?)', re.escape(modelo)), re.DOTALL)


@lru_cache(maxsize=8)
def _padroes(idioma: str | None) -> tuple[tuple[re.Pattern, str], ...]:
    padroes = []
    for msgid, clara in MENSAGENS_PADRAO.items():
        for modelo in {msgid, translation.gettext(msgid)}:
            padroes.append((_padrao(modelo), clara))
    return tuple(padroes)


def normalizar(mensagem) -> str:
    """Devolve a versão clara de uma mensagem padrão do DRF; qualquer outra volta igual."""
    texto = str(mensagem)
    for padrao, clara in _padroes(translation.get_language()):
        encontrado = padrao.fullmatch(texto)
        if encontrado:
            return clara.format(**encontrado.groupdict())
    return texto


def normalizar_campos(campos: dict[str, list] | None) -> dict[str, list[str]] | None:
    if not campos:
        return campos
    return {campo: [normalizar(m) for m in mensagens] for campo, mensagens in campos.items()}
