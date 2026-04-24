"""Request-scoped context (traceability without threading globals)."""

from __future__ import annotations

import contextvars
import uuid
from typing import Any

_request_id: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)
_user_id: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_id", default=None)


def get_request_id() -> str | None:
    return _request_id.get()


def set_request_id(value: str | None) -> contextvars.Token[str | None]:
    return _request_id.set(value)


def reset_request_id(token: contextvars.Token[str | None]) -> None:
    _request_id.reset(token)


def new_request_id() -> str:
    return str(uuid.uuid4())


def get_context_user_id() -> str | None:
    return _user_id.get()


def set_user_id(value: str | None) -> contextvars.Token[str | None]:
    return _user_id.set(value)


def reset_user_id(token: contextvars.Token[str | None]) -> None:
    _user_id.reset(token)


def context_bind() -> dict[str, Any]:
    out: dict[str, Any] = {}
    if rid := get_request_id():
        out["request_id"] = rid
    if uid := get_context_user_id():
        out["user_id"] = uid
    return out
