"""Chamada HTTP comum aos adaptadores reais: timeout, classificação de erros e remoção de segredos."""
from __future__ import annotations

import json
import re
import time

import httpx

from apps.ia.domain.ports import ErroProvedor
from apps.ia.domain.prazos import TIMEOUT_CONEXAO_S

MSG_OCUPADO = 'O serviço de IA está ocupado agora. Tente de novo em alguns minutos.'
MSG_COTA = 'O limite de uso da IA foi atingido. Tente de novo mais tarde.'
MSG_MODELO = 'O modelo de IA configurado não está disponível.'
MSG_RECUSADO = 'A IA recusou o pedido. Revise os dados e tente de novo.'
MSG_CREDENCIAL = 'A IA não aceitou a credencial configurada. Avise o administrador.'
MSG_TIMEOUT = 'A IA demorou demais para responder. Tente de novo.'
MSG_CONEXAO = 'Não foi possível falar com o serviço de IA. Verifique a conexão.'
MSG_FORMATO = 'A IA respondeu fora do formato esperado. Tente de novo.'
MSG_BLOQUEADO = 'A IA recusou o conteúdo por política de segurança do provedor.'

_MODELO_VALIDO = re.compile(r'^[\w.\-:/]+$')


def checar_modelo(modelo: str) -> str:
    if not modelo or not _MODELO_VALIDO.match(modelo) or '..' in modelo:
        raise ErroProvedor(MSG_MODELO, temporario=True, codigo='modelo_invalido')
    return modelo


def sem_segredo(texto: str, *segredos: str) -> str:
    for segredo in segredos:
        if segredo:
            texto = texto.replace(segredo, '***')
    return texto[:500]


def erro_por_status(status: int, corpo: str, *segredos: str) -> ErroProvedor:
    detalhe = f'HTTP {status}: {sem_segredo(corpo, *segredos)}'
    if status == 429:
        return ErroProvedor(MSG_COTA, temporario=True, codigo='cota', detalhe=detalhe)
    if status == 404:
        return ErroProvedor(MSG_MODELO, temporario=True, codigo='modelo_indisponivel', detalhe=detalhe)
    if status >= 500:
        return ErroProvedor(MSG_OCUPADO, temporario=True, codigo='indisponivel', detalhe=detalhe)
    if status in (401, 403):
        return ErroProvedor(MSG_CREDENCIAL, temporario=False, codigo='credencial', detalhe=detalhe)
    return ErroProvedor(MSG_RECUSADO, temporario=False, codigo='requisicao_invalida', detalhe=detalhe)


def post_json(url: str, *, headers: dict, corpo: dict, timeout: float, transport=None,
              segredos: tuple[str, ...] = ()) -> tuple[dict, int]:
    """POST com JSON. Devolve (resposta decodificada, duração em ms) ou lança ErroProvedor.

    `timeout` vale para leitura/escrita/pool; a conexão tem limite próprio e curto (`TIMEOUT_CONEXAO_S`), para que
    uma rede fora do ar falhe rápido e passe para a reserva sem consumir o timeout inteiro da tentativa.
    """
    inicio = time.monotonic()
    limites = httpx.Timeout(timeout, connect=min(TIMEOUT_CONEXAO_S, timeout))
    try:
        with httpx.Client(timeout=limites, transport=transport) as cliente:
            resposta = cliente.post(url, headers=headers, json=corpo)
    except httpx.TimeoutException:
        raise ErroProvedor(MSG_TIMEOUT, temporario=True, codigo='timeout') from None
    except httpx.HTTPError as exc:
        raise ErroProvedor(MSG_CONEXAO, temporario=True, codigo='conexao',
                           detalhe=sem_segredo(type(exc).__name__, *segredos)) from None
    duracao_ms = int((time.monotonic() - inicio) * 1000)
    if resposta.status_code >= 400:
        raise erro_por_status(resposta.status_code, resposta.text, *segredos)
    try:
        return resposta.json(), duracao_ms
    except ValueError:
        raise ErroProvedor(MSG_FORMATO, temporario=True, codigo='resposta_invalida',
                           detalhe='corpo HTTP não é JSON') from None


def decodificar_json(texto: str) -> dict:
    """JSON gerado pelo modelo. Aceita bloco cercado por ``` (alguns provedores no modo texto)."""
    texto = (texto or '').strip()
    if texto.startswith('```'):
        texto = re.sub(r'^```(?:json)?\s*|\s*```$', '', texto)
    try:
        dados = json.loads(texto)
    except ValueError:
        raise ErroProvedor(MSG_FORMATO, temporario=True, codigo='resposta_invalida',
                           detalhe=f'JSON inválido: {texto[:200]}') from None
    if not isinstance(dados, dict):
        raise ErroProvedor(MSG_FORMATO, temporario=True, codigo='resposta_invalida', detalhe='JSON não é objeto')
    return dados
