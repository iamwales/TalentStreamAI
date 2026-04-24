"""Heuristic post-checks for LLM outputs (not a substitute for review)."""

from __future__ import annotations

import re


def llm_output_safety_flags(text: str) -> list[str]:
    """
    Returns tags that may warrant human review (e.g. placeholders, truncation).
    These are *signals*, not determinations of hallucination.
    """
    if not text or not str(text).strip():
        return ["empty_output"]
    t = str(text)
    out: list[str] = []
    if re.search(r"\[([^\]]+)\]", t):
        out.append("bracket_placeholders")
    if len(t) < 40:
        out.append("suspiciously_short")
    if t.count("lorem") >= 1:
        out.append("lorem_ipsum")
    return out
