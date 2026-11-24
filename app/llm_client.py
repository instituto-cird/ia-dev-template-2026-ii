"""
app/llm_client.py — Cliente mínimo compatible con el SDK de OpenAI, sobre httpx.

`agent.core.run_agent` espera un objeto con `client.chat.completions.create(...)`.
En vez de sumar el SDK de `openai` como dependencia obligatoria, este adaptador
habla directo con cualquier endpoint `/v1/chat/completions` compatible
(el Mock LLM local, OpenAI, Ollama, etc.) y devuelve la misma forma de respuesta
(`response.choices[0].message.content`).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import httpx


class LLMUnavailableError(RuntimeError):
    """El servicio LLM no respondió (caído, timeout o error HTTP)."""


@dataclass
class _Message:
    content: str


@dataclass
class _Choice:
    message: _Message


@dataclass
class _Completion:
    choices: list[_Choice]


class _Completions:
    def __init__(self, client: HttpLLMClient) -> None:
        self._client = client

    def create(self, model: str, messages: list[dict[str, str]], **kwargs: Any) -> _Completion:
        payload: dict[str, Any] = {"model": model, "messages": messages, **kwargs}
        try:
            response = self._client.http.post("/chat/completions", json=payload)
            response.raise_for_status()
        except httpx.HTTPError as e:
            raise LLMUnavailableError(
                f"No se pudo contactar al LLM en {self._client.base_url}: {e}"
            ) from e
        data = response.json()
        content = data["choices"][0]["message"].get("content") or ""
        return _Completion(choices=[_Choice(message=_Message(content=content))])


class _Chat:
    def __init__(self, client: HttpLLMClient) -> None:
        self.completions = _Completions(client)


class HttpLLMClient:
    """Cliente OpenAI-compatible: `HttpLLMClient().chat.completions.create(...)`."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = (
            base_url or os.getenv("OPENAI_BASE_URL") or "http://localhost:8001/v1"
        ).rstrip("/")
        key = api_key or os.getenv("OPENAI_API_KEY", "")
        headers = {"Authorization": f"Bearer {key}"} if key else {}
        self.http = httpx.Client(base_url=self.base_url, headers=headers, timeout=timeout)
        self.chat = _Chat(self)

    def ping(self) -> bool:
        """True si el servicio LLM responde. Para el Mock usa /health; si no, /models."""
        root = self.base_url.removesuffix("/v1")
        try:
            r = httpx.get(f"{root}/health", timeout=1.5)
            if r.status_code == 200:
                return True
            r = self.http.get("/models", timeout=1.5)
            return r.status_code < 500
        except httpx.HTTPError:
            return False

    def close(self) -> None:
        self.http.close()
