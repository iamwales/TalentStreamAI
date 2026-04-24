"""Health, readiness, and Prometheus metrics (when enabled)."""

from __future__ import annotations

from fastapi import APIRouter, Response
from fastapi.responses import PlainTextResponse

from app.core import metrics
from app.core.config import settings
from app.core.db import get_conn

router = APIRouter()


@router.get("/ready", tags=["health"])
def ready() -> dict[str, str]:
    """Readiness: verify DB connectivity (swap for deep checks in k8s)."""
    try:
        conn = get_conn()
        try:
            conn.execute("SELECT 1")
        finally:
            conn.close()
    except Exception as e:
        return {"status": "not_ready", "reason": f"db: {e}"}
    return {"status": "ready"}


@router.get("/metrics", include_in_schema=False)
def prometheus_metrics() -> Response:
    if not settings.enable_prometheus:
        return Response(status_code=404)
    return PlainTextResponse(
        content=metrics.metrics_payload().decode("utf-8"),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )
