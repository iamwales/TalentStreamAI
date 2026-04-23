from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import AsyncRetrying, retry_if_exception, stop_after_attempt, wait_exponential_jitter

from app.core.config import settings
from app.services.llm.json_parsing import parse_json_object

logger = logging.getLogger(__name__)

_http_clients_by_loop: dict[asyncio.AbstractEventLoop, httpx.AsyncClient] = {}


def _http_client() -> httpx.AsyncClient:
    loop = asyncio.get_running_loop()
    client = _http_clients_by_loop.get(loop)
    if client is None or client.is_closed:
        client = httpx.AsyncClient(timeout=httpx.Timeout(settings.llm_timeout_seconds))
        _http_clients_by_loop[loop] = client
    return client


async def close_llm_http_clients() -> None:
    clients = list(_http_clients_by_loop.values())
    _http_clients_by_loop.clear()
    for client in clients:
        if not client.is_closed:
            await client.aclose()


@dataclass(frozen=True)
class LlmMessage:
    role: str
    content: str


class LlmError(RuntimeError):
    pass


class LlmClient:
    def __init__(self) -> None:
        self._base_url = settings.llm_base_url.rstrip("/")
        self._api_key = settings.llm_api_key
        self._model = settings.llm_model

    def _headers(self) -> dict[str, str]:
        if not self._api_key:
            raise LlmError("LLM_API_KEY is required when AGENT_MODE=llm")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        if settings.openrouter_referer:
            headers["HTTP-Referer"] = settings.openrouter_referer
        if settings.openrouter_title:
            headers["X-Title"] = settings.openrouter_title
        return headers

    async def chat_json(self, *, messages: list[LlmMessage]) -> dict[str, Any]:
        url = f"{self._base_url}/v1/chat/completions"
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": [m.__dict__ for m in messages],
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "response_format": {"type": "json_object"},
        }

        def _is_retryable_http_status(exc: httpx.HTTPStatusError) -> bool:
            status = exc.response.status_code if exc.response else None
            if status is None:
                return True
            return status == 429 or 500 <= status <= 599 or status == 408

        def _is_retryable_exc(exc: Exception) -> bool:
            if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError)):
                return True
            if isinstance(exc, httpx.HTTPStatusError):
                return _is_retryable_http_status(exc)
            return False

        async for attempt in AsyncRetrying(
            reraise=True,
            stop=stop_after_attempt(3),
            wait=wait_exponential_jitter(initial=0.5, max=4.0),
            retry=retry_if_exception(_is_retryable_exc),
        ):
            with attempt:
                resp = await _http_client().post(url, headers=self._headers(), json=payload)
                try:
                    resp.raise_for_status()
                except httpx.HTTPStatusError as e:
                    body = (resp.text or "")[:500]
                    logger.warning("LLM HTTP error %s: %s", resp.status_code, body)
                    raise
                data = resp.json()

        try:
            text = data["choices"][0]["message"]["content"]
        except Exception as e:
            raise LlmError("Malformed LLM response") from e

        try:
            return parse_json_object(text)
        except Exception as e:
            logger.warning("Failed to parse JSON from LLM output", exc_info=e)
            raise LlmError("LLM did not return valid JSON") from e
