from __future__ import annotations

import json


def parse_json_object(text: str) -> dict:
    raw = (text or "").strip()
    if not raw:
        raise ValueError("Empty LLM response")

    try:
        obj = json.loads(raw)
        if not isinstance(obj, dict):
            raise ValueError("Expected a JSON object")
        return obj
    except json.JSONDecodeError:
        pass

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Could not locate JSON object in response")

    snippet = raw[start : end + 1]
    obj = json.loads(snippet)
    if not isinstance(obj, dict):
        raise ValueError("Expected a JSON object")
    return obj
