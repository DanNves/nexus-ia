"""Adaptador Google Gemini (API REST nativa `generateContent`, saída por `responseJsonSchema`).

A chave vai só no header `x-goog-api-key` (nunca na URL), então não aparece em logs de requisição.
"""
from __future__ import annotations

from apps.ia.adapters import _http
from apps.ia.domain.ports import ErroProvedor, LLMProvider, ParametrosGeracao, ResultadoGeracao, texto_do_contexto

_FIM_BLOQUEADO = {'SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY'}


class GeminiProvider(LLMProvider):
    nome = 'gemini'
    real = True

    def __init__(self, *, api_key: str, modelos, url_base: str, temperatura: float = 0.3, timeout: float = 60,
                 nivel_raciocinio: str = 'low', modelo_embedding: str = 'gemini-embedding-2', transport=None):
        super().__init__(modelos)
        self._chave = api_key
        self._url_base = url_base.rstrip('/')
        self._temperatura = temperatura
        self._timeout = timeout
        self._nivel_raciocinio = nivel_raciocinio
        self._modelo_embedding = modelo_embedding
        self._transport = transport

    def _post(self, modelo: str, metodo: str, corpo: dict, timeout: float | None = None) -> tuple[dict, int]:
        if not self._chave:
            raise ErroProvedor(_http.MSG_CREDENCIAL, temporario=False, codigo='credencial', detalhe='GEMINI_API_KEY vazia')
        url = f'{self._url_base}/models/{_http.checar_modelo(modelo)}:{metodo}'
        return _http.post_json(url, headers={'x-goog-api-key': self._chave}, corpo=corpo,
                               timeout=timeout or self._timeout, transport=self._transport, segredos=(self._chave,))

    def gerar_estruturado(self, prompt, schema, contexto, *, modelo=None, parametros=None) -> ResultadoGeracao:
        modelo = modelo or self.modelos[0]
        parametros = parametros or ParametrosGeracao()
        geracao = {
            'responseMimeType': 'application/json',
            'responseJsonSchema': schema,
            'temperature': self._temperatura,
        }
        if parametros.max_tokens_saida:
            geracao['maxOutputTokens'] = parametros.max_tokens_saida
        # Nível da tarefa > global. Atenção: `minimal` não é aceito pelo gemini-3.8-flash (400 = falha definitiva).
        nivel = parametros.nivel_raciocinio or self._nivel_raciocinio
        if nivel:
            geracao['thinkingConfig'] = {'thinkingLevel': nivel}
        corpo = {
            'systemInstruction': {'parts': [{'text': prompt}]},
            'contents': [{'role': 'user', 'parts': [{'text': texto_do_contexto(contexto)}]}],
            'generationConfig': geracao,
        }
        resposta, duracao_ms = self._post(modelo, 'generateContent', corpo, timeout=parametros.timeout_segundos)

        candidatos = resposta.get('candidates') or []
        if not candidatos:
            motivo = (resposta.get('promptFeedback') or {}).get('blockReason', 'sem candidatos')
            raise ErroProvedor(_http.MSG_BLOQUEADO, temporario=False, codigo='bloqueado', detalhe=str(motivo))
        candidato = candidatos[0]
        fim = candidato.get('finishReason', '')
        if fim in _FIM_BLOQUEADO:
            raise ErroProvedor(_http.MSG_BLOQUEADO, temporario=False, codigo='bloqueado', detalhe=fim)

        partes = (candidato.get('content') or {}).get('parts') or []
        texto = ''.join(p.get('text', '') for p in partes if not p.get('thought'))
        dados = _http.decodificar_json(texto)  # MAX_TOKENS corta o JSON → resposta_invalida (tenta a reserva)

        uso = resposta.get('usageMetadata') or {}
        return ResultadoGeracao(
            dados=dados,
            modelo=resposta.get('modelVersion') or modelo,
            tokens_entrada=int(uso.get('promptTokenCount') or 0),
            tokens_saida=int(uso.get('candidatesTokenCount') or 0),
            tokens_raciocinio=int(uso.get('thoughtsTokenCount') or 0),
            duracao_ms=duracao_ms,
        )

    def embedding(self, texto: str) -> list[float]:
        corpo = {'content': {'parts': [{'text': texto}]}}
        resposta, _ = self._post(self._modelo_embedding, 'embedContent', corpo)
        valores = (resposta.get('embedding') or {}).get('values')
        if not isinstance(valores, list):
            raise ErroProvedor(_http.MSG_FORMATO, temporario=True, codigo='resposta_invalida', detalhe='sem embedding')
        return [float(v) for v in valores]


def criar(config) -> GeminiProvider:
    """Fábrica usada pelo registro (`apps/ia/adapters/__init__.py`). `config` = django.conf.settings."""
    return GeminiProvider(
        api_key=config.GEMINI_API_KEY,
        modelos=[config.IA_MODELO, *config.IA_MODELOS_RESERVA],
        url_base=config.GEMINI_URL_BASE,
        temperatura=config.IA_TEMPERATURA,
        timeout=config.IA_TIMEOUT_SEGUNDOS,
        nivel_raciocinio=config.GEMINI_NIVEL_RACIOCINIO,
        modelo_embedding=getattr(config, 'IA_MODELO_EMBEDDING', 'gemini-embedding-2'),
    )
