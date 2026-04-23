from __future__ import annotations

import re

from app.core.config import settings


_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")


def normalize_user_text(text: str) -> str:
    cleaned = _CONTROL_CHARS.sub("", text).strip()
    if len(cleaned) > settings.max_text_chars:
        cleaned = cleaned[: settings.max_text_chars]
    return cleaned
