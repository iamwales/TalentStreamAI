"""Consistent error bodies with traceable request ids for unexpected failures."""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import Request
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = structlog.get_logger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, RequestValidationError):
        return await request_validation_exception_handler(request, exc)
    if isinstance(exc, StarletteHTTPException):
        return await http_exception_handler(request, exc)
    err_id = str(uuid.uuid4())
    log.exception("unhandled_exception", error_id=err_id, path=request.url.path)
    body: dict[str, Any] = {
        "detail": "An internal error occurred.",
        "errorId": err_id,
    }
    rid = request.headers.get("X-Request-Id")
    if rid:
        body["requestId"] = rid
    return JSONResponse(status_code=500, content=body)
