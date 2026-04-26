"""Langfuse client (optional) for LLM generations and LangChain runs."""

from __future__ import annotations

import logging
from contextlib import contextmanager, nullcontext
from typing import Any, Iterator

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from langfuse import Langfuse
except ImportError:  # pragma: no cover
    Langfuse = None  # type: ignore[misc, assignment]

_client: Any | None = None


def get_tracing_client() -> Any | None:
    """Return a configured Langfuse client, or None when tracing is off or not configured.

    The SDK is optional at import time; if ``langfuse`` is missing, returns None.
    """
    global _client
    if Langfuse is None:
        return None
    if not settings.langfuse_tracing_enabled:
        return None
    if not (settings.langfuse_public_key and settings.langfuse_secret_key):
        return None
    if _client is not None:
        return _client
    base = (settings.langfuse_base_url or "https://cloud.langfuse.com").rstrip("/")
    _client = Langfuse(
        public_key=settings.langfuse_public_key,
        secret_key=settings.langfuse_secret_key,
        base_url=base,
        environment=(settings.deployment_environment or "default").lower(),
        tracing_enabled=True,
    )
    return _client


def ensure_langfuse_ready() -> bool:
    """Eagerly initialize Langfuse when keys are set so LangChain callbacks resolve ``get_client()``."""
    c = get_tracing_client()
    return c is not None


def flush_langfuse() -> None:
    """Best-effort flush of queued Langfuse spans (call after LLM work and on shutdown)."""
    if _client is None:
        return
    try:
        _client.flush()
    except Exception:
        logger.debug("langfuse flush failed", exc_info=True)


@contextmanager
def tailor_pipeline_span(*, user_id: str, base_resume_id: str) -> Iterator[None]:
    """Parent span for a full tailor run; nested ``llm.chat_completions`` generations attach under it."""
    lf = get_tracing_client()
    if lf is None:
        yield
        return
    try:
        with lf.start_as_current_observation(
            as_type="span",
            name="tailor.run",
            metadata={"user_id": user_id, "base_resume_id": base_resume_id},
        ):
            yield
    except Exception:
        logger.debug("langfuse tailor span failed, continuing", exc_info=True)
        yield


@contextmanager
def chat_completions_span(
    *,
    messages: list[dict[str, str]],
    model: str,
    base_url: str,
    temperature: float,
    max_tokens: int,
) -> Iterator[Any]:
    """Context manager for one OpenAI-compatible /v1/chat/completions call (LlmClient)."""
    lf = get_tracing_client()
    if lf is None:
        with nullcontext(None) as gen:
            yield gen
        return
    try:
        with lf.start_as_current_observation(
            as_type="generation",
            name="llm.chat_completions",
            model=model,
            input=messages,
            model_parameters={
                "temperature": float(temperature),
                "max_tokens": int(max_tokens),
                "response_format": "json_object",
            },
            metadata={"llm_base_url": base_url, "http_client": "httpx"},
        ) as gen:
            yield gen
    except Exception:
        logger.debug("langfuse generation span failed, continuing without trace", exc_info=True)
        with nullcontext(None) as gen:
            yield gen


def generation_mark_success(
    gen: Any,
    *,
    assistant_text: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> None:
    if gen is None:
        return
    try:
        usage: dict[str, int] | None = None
        if prompt_tokens or completion_tokens:
            usage = {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
            }
        gen.update(output=assistant_text, usage_details=usage)
    except Exception:
        logger.debug("langfuse generation update (success) failed", exc_info=True)


def generation_mark_error(gen: Any, exc: BaseException) -> None:
    if gen is None:
        return
    try:
        gen.update(
            level="ERROR",
            status_message=str(exc)[:2000],
        )
    except Exception:
        logger.debug("langfuse generation update (error) failed", exc_info=True)
