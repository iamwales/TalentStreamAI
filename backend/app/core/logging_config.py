"""Structured logging: JSON (production) or console (local)."""

from __future__ import annotations

import logging
import sys

import structlog

from app.core.config import settings


def configure_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)
    shared: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.dev.set_exc_info,
    ]
    if settings.log_json:
        processors: list[structlog.types.Processor] = [
            *shared,
            timestamper,
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        processors = [
            *shared,
            timestamper,
            structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty()),
        ]

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    root = logging.getLogger()
    root.setLevel(level)
    for name in ("httpx", "httpcore", "uvicorn", "uvicorn.error"):
        logging.getLogger(name).setLevel(logging.WARNING)
