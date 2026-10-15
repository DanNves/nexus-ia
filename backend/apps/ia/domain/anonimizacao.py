"""Anonimização antes de enviar dados ao provedor de IA (LGPD — CLAUDE.md §19).

Troca e-mails, CNPJ, CPF, telefones brasileiros e nomes conhecidos por marcadores (`[EMAIL_1]`, `[PESSOA_1]`...).
O original fica na plataforma; o mapa marcador → original serve para restaurar o resultado da IA.

Limitação conhecida: nomes que não estão na lista recebida (ex.: "falar com o João da TI") não são detectados.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# Ordem importa: CNPJ (14 dígitos) antes de CPF (11) e CPF antes de telefone.
_PADROES: tuple[tuple[str, re.Pattern], ...] = (
    ('EMAIL', re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')),
    ('CNPJ', re.compile(r'(?<!\d)\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}(?!\d)')),
    ('CPF', re.compile(r'(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)')),
    ('TELEFONE', re.compile(
        r'(?<![\d.])(?:\+?55[\s-]?)?'
        r'(?:\(\d{2}\)\s?9?\d{4}-?\d{4}'           # (71) 99876-5432 / (71)998765432
        r'|(?:\d{2}[\s-])?9?\d{4}[\s-]\d{4})'      # 71 99876-5432 / 3333-4444
        r'(?!\d|\.\d)'  # ponto final da frase é aceito ("ligue (71) 99876-5432."); "1234-5678.90" não
    )),
)
_MARCADOR = re.compile(r'\[(?:EMAIL|CNPJ|CPF|TELEFONE|PESSOA)_\d+\]')
_TAMANHO_MINIMO_NOME = 3


@dataclass
class ResultadoAnonimizacao:
    dados: object
    mapa: dict[str, str] = field(default_factory=dict)  # marcador → texto original
    substituicoes: int = 0


class Anonimizador:
    """Uma instância por geração: o mesmo valor recebe sempre o mesmo marcador."""

    def __init__(self, nomes: list[str] | tuple[str, ...] = ()):
        self._mapa: dict[str, str] = {}
        self._por_valor: dict[tuple[str, str], str] = {}
        self._contagem: dict[str, int] = {}
        self.substituicoes = 0
        self._padroes_nome = self._compilar_nomes(nomes)

    @staticmethod
    def _compilar_nomes(nomes) -> list[re.Pattern]:
        limpos = {' '.join(n.split()) for n in nomes if n and len(n.strip()) >= _TAMANHO_MINIMO_NOME}
        compostos = {n for n in limpos if ' ' in n}
        # Palavra única (nome de uma palavra ou primeiro nome): só com inicial maiúscula, para não trocar
        # palavras comuns ("equipe", "rosa").
        simples = ({n for n in limpos if ' ' not in n} | {n.split()[0] for n in compostos})
        simples = {n for n in simples if len(n) >= _TAMANHO_MINIMO_NOME and n[0].isupper()}
        padroes = []
        # Nome composto, sem diferenciar maiúsculas; os mais longos primeiro ("Ana Maria Lima" antes de "Ana").
        for nome in sorted(compostos, key=len, reverse=True):
            padroes.append(re.compile(rf'(?<!\w){re.escape(nome).replace(r"\ ", r"\s+")}(?!\w)', re.IGNORECASE))
        for nome in sorted(simples, key=len, reverse=True):
            padroes.append(re.compile(rf'(?<!\w){re.escape(nome)}(?!\w)'))
        return padroes

    def _marcador(self, tipo: str, original: str) -> str:
        chave = (tipo, original.casefold())
        if chave not in self._por_valor:
            self._contagem[tipo] = self._contagem.get(tipo, 0) + 1
            marcador = f'[{tipo}_{self._contagem[tipo]}]'
            self._por_valor[chave] = marcador
            self._mapa[marcador] = original
        self.substituicoes += 1
        return self._por_valor[chave]

    def _texto(self, texto: str) -> str:
        for tipo, padrao in _PADROES:
            texto = padrao.sub(lambda m, t=tipo: self._marcador(t, m.group(0)), texto)
        for padrao in self._padroes_nome:
            texto = padrao.sub(lambda m: self._marcador('PESSOA', m.group(0)), texto)
        return texto

    def _percorrer(self, dado):
        if isinstance(dado, str):
            return self._texto(dado)
        if isinstance(dado, dict):
            return {chave: self._percorrer(valor) for chave, valor in dado.items()}
        if isinstance(dado, (list, tuple)):
            return [self._percorrer(item) for item in dado]
        return dado

    def anonimizar(self, dado) -> ResultadoAnonimizacao:
        """Anonimiza strings dentro de dict/list/str (as chaves dos dicts não mudam)."""
        novo = self._percorrer(dado)
        return ResultadoAnonimizacao(dados=novo, mapa=dict(self._mapa), substituicoes=self.substituicoes)


def anonimizar(dado, nomes: list[str] | tuple[str, ...] = ()) -> ResultadoAnonimizacao:
    return Anonimizador(nomes).anonimizar(dado)


def restaurar(dado, mapa: dict[str, str]):
    """Devolve os valores originais no lugar dos marcadores (em dict/list/str)."""
    if not mapa:
        return dado
    if isinstance(dado, str):
        return _MARCADOR.sub(lambda m: mapa.get(m.group(0), m.group(0)), dado)
    if isinstance(dado, dict):
        return {chave: restaurar(valor, mapa) for chave, valor in dado.items()}
    if isinstance(dado, list):
        return [restaurar(item, mapa) for item in dado]
    return dado


def dados_pessoais_em(texto: str) -> list[tuple[str, str]]:
    """(tipo, trecho) de cada e-mail, CNPJ, CPF ou telefone encontrado, e de marcadores que sobraram no texto.

    Usado pela avaliação de qualidade para conferir que a saída da IA não carrega dados pessoais.
    """
    achados: list[tuple[str, str]] = []
    for tipo, padrao in _PADROES:
        for trecho in padrao.findall(texto):
            achados.append((tipo, trecho))
        texto = padrao.sub(' ', texto)  # mesma ordem da anonimização: CNPJ não é contado também como CPF
    achados += [('MARCADOR', m) for m in _MARCADOR.findall(texto)]
    return achados
