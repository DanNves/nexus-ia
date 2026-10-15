"""Adaptador para qualquer API compatível com OpenAI Chat Completions.

Serve para OpenAI, Groq, DeepSeek, Mistral, OpenRouter, Together, Ollama, LM Studio, vLLM...: basta trocar
`OPENAI_COMPAT_URL_BASE`, `OPENAI_COMPAT_API_KEY` (vazia para servidores locais) e `IA_MODELO`.

`OPENAI_COMPAT_FORMATO`:
- `json_schema` → `response_format` com o esquema em modo estrito (OpenAI, Groq, OpenRouter, Ollama recente);
- `json_object` → só exige JSON; o esquema vai junto das instruções (DeepSeek, Mistral e servidores antigos);
- qualquer outro valor (ex.: `texto`) → sem `response_format`; o esquema vai nas instruções.
Em todos os casos o serviço valida a resposta contra o esquema.
"""
from __future__ import annotations

import json

from apps.ia.adapters import _http
from apps.ia.domain.ports import ErroProvedor, LLMProvider, ParametrosGeracao, ResultadoGeracao, texto_do_contexto


_LIMITES_DE_TEXTO = ('minLength', 'maxLength')


def _sem_limites_de_texto(schema):
    """Cópia do esquema sem minLength/maxLength: o modo `strict` de vários servidores recusa essas palavras-chave
    (HTTP 400 = falha definitiva). O limite continua garantido pelo validador do serviço (`domain/esquema.py`)."""
    if isinstance(schema, dict):
        return {k: _sem_limites_de_texto(v) for k, v in schema.items() if k not in _LIMITES_DE_TEXTO}
    if isinstance(schema, list):
        return [_sem_limites_de_texto(v) for v in schema]
    return schema


class OpenAICompatProvider(LLMProvider):
    nome = 'openai_compat'
    real = True

    def __init__(self, *, api_key: str, modelos, url_base: str, formato: str = 'json_schema', temperatura: float = 0.3,
                 timeout: float = 60, modelo_embedding: str = 'text-embedding-3-small', transport=None):
        super().__init__(modelos)
        self._chave = api_key
        self._url_base = url_base.rstrip('/')
        self._formato = formato
        self._temperatura = temperatura
        self._timeout = timeout
        self._modelo_embedding = modelo_embedding
        self._transport = transport

    def _post(self, caminho: str, corpo: dict, timeout: float | None = None) -> tuple[dict, int]:
        headers = {'Authorization': f'Bearer {self._chave}'} if self._chave else {}
        return _http.post_json(f'{self._url_base}/{caminho}', headers=headers, corpo=corpo,
                               timeout=timeout or self._timeout, transport=self._transport, segredos=(self._chave,))

    def gerar_estruturado(self, prompt, schema, contexto, *, modelo=None, parametros=None) -> ResultadoGeracao:
        modelo = _http.checar_modelo(modelo or self.modelos[0])
        parametros = parametros or ParametrosGeracao()  # nivel_raciocinio não tem equivalente portável: ignorado
        instrucoes = prompt
        corpo: dict = {'model': modelo, 'temperature': self._temperatura}
        if parametros.max_tokens_saida:
            # `max_tokens` é o nome aceito pela maioria dos servidores compatíveis (Groq, DeepSeek, Ollama, vLLM...).
            corpo['max_tokens'] = parametros.max_tokens_saida
        if self._formato == 'json_schema':
            corpo['response_format'] = {
                'type': 'json_schema',
                'json_schema': {'name': 'resposta', 'schema': _sem_limites_de_texto(schema), 'strict': True},
            }
        else:
            instrucoes += ('\n\nResponda somente com um objeto JSON válido que siga este esquema JSON:\n'
                           + json.dumps(schema, ensure_ascii=False))
            if self._formato == 'json_object':
                corpo['response_format'] = {'type': 'json_object'}
        corpo['messages'] = [
            {'role': 'system', 'content': instrucoes},
            {'role': 'user', 'content': texto_do_contexto(contexto)},
        ]
        resposta, duracao_ms = self._post('chat/completions', corpo, timeout=parametros.timeout_segundos)

        escolhas = resposta.get('choices') or []
        if not escolhas:
            raise ErroProvedor(_http.MSG_FORMATO, temporario=True, codigo='resposta_invalida', detalhe='sem choices')
        escolha = escolhas[0]
        mensagem = escolha.get('message') or {}
        if escolha.get('finish_reason') == 'content_filter' or mensagem.get('refusal'):
            raise ErroProvedor(_http.MSG_BLOQUEADO, temporario=False, codigo='bloqueado',
                               detalhe=str(mensagem.get('refusal') or 'content_filter')[:200])
        dados = _http.decodificar_json(mensagem.get('content') or '')

        uso = resposta.get('usage') or {}
        detalhes = uso.get('completion_tokens_details') or {}
        return ResultadoGeracao(
            dados=dados,
            modelo=resposta.get('model') or modelo,
            tokens_entrada=int(uso.get('prompt_tokens') or 0),
            tokens_saida=int(uso.get('completion_tokens') or 0),
            tokens_raciocinio=int(detalhes.get('reasoning_tokens') or 0),
            duracao_ms=duracao_ms,
        )

    def embedding(self, texto: str) -> list[float]:
        resposta, _ = self._post('embeddings', {'model': self._modelo_embedding, 'input': texto})
        try:
            return [float(v) for v in resposta['data'][0]['embedding']]
        except (KeyError, IndexError, TypeError):
            raise ErroProvedor(_http.MSG_FORMATO, temporario=True, codigo='resposta_invalida',
                               detalhe='sem embedding') from None


def criar(config) -> OpenAICompatProvider:
    return OpenAICompatProvider(
        api_key=config.OPENAI_COMPAT_API_KEY,
        modelos=[config.IA_MODELO, *config.IA_MODELOS_RESERVA],
        url_base=config.OPENAI_COMPAT_URL_BASE,
        formato=config.OPENAI_COMPAT_FORMATO,
        temperatura=config.IA_TEMPERATURA,
        timeout=config.IA_TIMEOUT_SEGUNDOS,
        modelo_embedding=getattr(config, 'IA_MODELO_EMBEDDING', 'text-embedding-3-small'),
    )
