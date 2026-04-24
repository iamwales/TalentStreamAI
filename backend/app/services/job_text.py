"""Turn structured job data (e.g. from the fetcher) into a single text block for the LLM."""

from __future__ import annotations

from typing import Any


def job_data_to_text(job: dict[str, Any]) -> str:
    if not job:
        return ""
    title = (job.get("title") or "").strip()
    company = (job.get("company") or "").strip()
    loc = (job.get("location") or "").strip()
    url = (job.get("url") or "").strip()
    desc = (job.get("description") or "").strip()
    req = (job.get("requirements") or "").strip()
    resp = (job.get("responsibilities") or "").strip()
    ben = (job.get("benefits") or "").strip()
    parts: list[str] = []
    if title or company:
        parts.append(f"{title} at {company}".strip())
    if loc:
        parts.append(f"Location: {loc}")
    if url:
        parts.append(f"Source URL: {url}")
    for label, val in (
        ("Full description", desc),
        ("Requirements", req),
        ("Responsibilities", resp),
        ("Benefits", ben),
    ):
        if val:
            parts.append(f"{label}:\n{val}")
    return "\n\n".join(parts) if parts else desc
