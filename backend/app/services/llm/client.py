from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any

import structlog
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    InternalServerError,
    RateLimitError,
)
from tenacity import (
    AsyncRetrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

from app.core import metrics
from app.core.config import settings
from app.services.llm.json_parsing import parse_json_object
from app.services.llm.safety import llm_output_safety_flags

logger = logging.getLogger(__name__)
slog = structlog.get_logger(__name__)


def chat_completions_url_from_base(llm_base_url: str) -> tuple[str, str]:
    """Build the full ``.../chat/completions`` URL and OpenAI-SDK ``base_url`` (…/v1).

    OpenRouter often uses ``https://openrouter.ai/api/v1``; we must not append a second
    ``/v1`` (see :class:`AsyncOpenAI` ``base_url``).
    """
    b = (llm_base_url or "https://api.openai.com").rstrip("/")
    if b.endswith("/v1"):
        return f"{b}/chat/completions", b
    root = f"{b}/v1"
    return f"{root}/chat/completions", root


def _is_openai_com_host(root: str) -> bool:
    h = (root or "").lower()
    return "api.openai.com" in h and "openrouter" not in h


def _openai_module_for_tracing() -> Any:
    """When Langfuse is on, use its OpenAI drop-in so calls are sent to the provider and traced."""
    from app.services.observability.langfuse_tracing import get_tracing_client

    if get_tracing_client() is not None:
        from langfuse.openai import openai as oa  # type: ignore[import-untyped]

        return oa
    import openai as oa

    return oa


async def close_llm_http_clients() -> None:
    """Reserved for app shutdown; LLM calls use the OpenAI SDK, not a shared httpx pool."""


@dataclass(frozen=True)
class LlmMessage:
    role: str
    content: str


class LlmError(RuntimeError):
    pass


def _is_retryable_openai(exc: BaseException) -> bool:
    if isinstance(
        exc,
        (RateLimitError, APIConnectionError, APITimeoutError, InternalServerError),
    ):
        return True
    if isinstance(exc, APIStatusError) and exc.response is not None:
        s = exc.status_code
        return s == 429 or 500 <= s <= 599 or s == 408
    return False


class LlmClient:
    """OpenAI-compatible JSON chat using the official ``openai`` async client.

    - **OpenAI (provider):** Every call is a real ``chat.completions`` request to
      ``api.openai.com`` or your ``LLM_BASE_URL``; usage and logs appear in the normal
      OpenAI project dashboard. The hosted **Traces** UI is aimed at the Agents SDK;
      plain Completions are still first-class API traffic with usage and logging.
    - **Langfuse (optional):** When ``LANGFUSE_*`` is set, we import ``openai`` through
      ``langfuse.openai`` so the same client calls are recorded in Langfuse per their
      OpenAI integration (no second parallel span in code).
    """

    def __init__(self) -> None:
        _, self._openai_api_root = chat_completions_url_from_base(
            settings.llm_base_url
        )
        self._api_key = settings.chat_completions_api_key
        self._model = settings.llm_model
        self._oa_mod = _openai_module_for_tracing()
        default_headers: dict[str, str] = {}
        if settings.openrouter_referer:
            default_headers["HTTP-Referer"] = settings.openrouter_referer
        if settings.openrouter_title:
            default_headers["X-Title"] = settings.openrouter_title
        self._default_headers = default_headers or None
        self._async_client: AsyncOpenAI | None = None

    def _ensure_async_client(self) -> AsyncOpenAI:
        if self._async_client is not None:
            return self._async_client
        if not self._api_key:
            raise LlmError(
                "OPENROUTER_API_KEY or OPENAI_API_KEY is required when AGENT_MODE=llm"
            )
        self._async_client = self._oa_mod.AsyncOpenAI(
            base_url=self._openai_api_root,
            api_key=self._api_key,
            default_headers=self._default_headers,
            timeout=settings.llm_timeout_seconds,
        )
        return self._async_client

    def _build_completion_kwargs(
        self, msg_dicts: list[dict[str, str]], *, with_json_object: bool
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": msg_dicts,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
        }
        if with_json_object and settings.llm_response_json_object:
            kwargs["response_format"] = {"type": "json_object"}
        if (
            _is_openai_com_host(self._openai_api_root)
            and settings.openai_chat_request_metadata
        ):
            kwargs["metadata"] = {
                "product": "talentstreamai",
                "component": "llm_client",
            }
        return kwargs

    async def chat_json(self, *, messages: list[LlmMessage]) -> dict[str, Any]:
        """Chat completion with ``response_format`` JSON when enabled; 400 → retry without it."""
        msg_dicts = [m.__dict__ for m in messages]
        client = self._ensure_async_client()
        t0 = time.perf_counter()
        try:
            want_json = settings.llm_response_json_object
            response: Any = None
            async for attempt in AsyncRetrying(
                reraise=True,
                stop=stop_after_attempt(3),
                wait=wait_exponential_jitter(initial=0.5, max=4.0),
                retry=retry_if_exception(_is_retryable_openai),
            ):
                with attempt:
                    try_json = want_json
                    while True:
                        kwargs = self._build_completion_kwargs(
                            msg_dicts, with_json_object=try_json
                        )
                        try:
                            response = await client.chat.completions.create(
                                **kwargs
                            )
                            break
                        except APIStatusError as e:
                            if e.status_code == 400 and try_json:
                                try_json = False
                                continue
                            raise
            if response is None:
                raise LlmError("No response from LLM")
        except APIStatusError as e:
            body = (e.response.text or "")[:500] if e.response else ""
            metrics.llm_calls.labels(self._model, "http_error").inc()
            raise LlmError(
                f"LLM request failed (HTTP {e.status_code}). "
                "Check LLM_BASE_URL, LLM_MODEL, and your API key. "
                f"Provider: {body[:280]}"
            ) from e
        return self._finalize_openai_response(response, t0)

    def _finalize_openai_response(self, response: Any, t0: float) -> dict[str, Any]:
        text = (response.choices[0].message.content) or ""
        u = response.usage
        pt = int(getattr(u, "prompt_tokens", None) or 0) if u else 0
        ct = int(getattr(u, "completion_tokens", None) or 0) if u else 0
        return self._finish_parse_metrics(text, pt, ct, t0)

    def _finish_parse_metrics(self, text: str, pt: int, ct: int, t0: float) -> dict[str, Any]:
        elapsed = time.perf_counter() - t0
        metrics.llm_latency.labels(self._model).observe(elapsed)
        metrics.llm_calls.labels(self._model, "success").inc()
        if pt:
            metrics.llm_tokens.labels(self._model, "prompt").inc(pt)
        if ct:
            metrics.llm_tokens.labels(self._model, "completion").inc(ct)
        if pt or ct:
            slog.info(
                "llm_token_usage",
                model=self._model,
                prompt_tokens=pt,
                completion_tokens=ct,
                duration_ms=round(elapsed * 1000, 2),
            )
        if not (text and text.strip()):
            metrics.llm_calls.labels(self._model, "malformed").inc()
            raise LlmError("Malformed LLM response")
        flags = llm_output_safety_flags(text)
        if flags:
            slog.warning(
                "llm_output_safety_flags",
                model=self._model,
                flags=flags,
            )
        try:
            return parse_json_object(text)
        except Exception as e:
            metrics.llm_calls.labels(self._model, "json_parse").inc()
            logger.warning("Failed to parse JSON from LLM output", exc_info=e)
            raise LlmError("LLM did not return valid JSON") from e
