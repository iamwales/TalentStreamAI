"""Request ID propagation, structlog context, and HTTP metrics."""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Match

from app.core.config import settings
from app.core import metrics
from app.core.request_context import new_request_id, reset_request_id, set_request_id


def _path_template(request: Request) -> str:
    for route in request.app.routes:
        match, _ = route.matches(request.scope)
        if match == Match.FULL and hasattr(route, "path"):
            return str(route.path)
    return request.url.path


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        structlog.contextvars.clear_contextvars()
        h = {k.lower(): v for k, v in request.headers.items()}
        rid = h.get("x-request-id") or new_request_id()
        tok = set_request_id(rid)
        structlog.contextvars.bind_contextvars(request_id=rid)
        path_t = _path_template(request)
        structlog.contextvars.bind_contextvars(http_path=path_t, http_method=request.method)
        t0 = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            dt = time.perf_counter() - t0
            if settings.enable_prometheus:
                metrics.http_requests.labels(
                    request.method, path_t, "5xx"
                ).inc()
                metrics.http_request_latency.labels(
                    request.method, path_t
                ).observe(dt)
            # Full traceback: global exception handler
            raise
        dt = time.perf_counter() - t0
        if settings.enable_prometheus:
            code = response.status_code
            bucket = f"{code // 100}xx"
            metrics.http_requests.labels(request.method, path_t, bucket).inc()
            metrics.http_request_latency.labels(request.method, path_t).observe(dt)
        response.headers["X-Request-Id"] = rid
        reset_request_id(tok)
        return response
