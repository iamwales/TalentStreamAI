"""Parse model-generated application email drafts into a stable {subject, body} shape."""

from __future__ import annotations

import re


def parse_draft_email(raw: str) -> dict[str, str]:
    t = (raw or "").strip()
    if not t:
        return {"subject": "Application", "body": ""}
    subject = "Application"
    body = t
    m = re.search(r"^\s*Subject:\s*(.+?)\s*$", t, re.IGNORECASE | re.MULTILINE)
    if m:
        subject = m.group(1).strip()[:200]
    # Strip common prefixes from the remaining body
    for pat in (r"^\s*Body:\s*", r"^\s*To:.*$"):
        t = re.sub(pat, "", t, flags=re.IGNORECASE | re.MULTILINE)
    lines = t.splitlines()
    out: list[str] = []
    skip = True
    for line in lines:
        if re.match(r"^\s*Subject:\s*", line, re.IGNORECASE):
            skip = True
            continue
        if re.match(r"^\s*Body:\s*", line, re.IGNORECASE):
            skip = False
            rest = re.sub(r"^\s*Body:\s*", "", line, flags=re.IGNORECASE)
            if rest.strip():
                out.append(rest)
            continue
        if skip and not line.strip():
            continue
        skip = False
        out.append(line)
    if out:
        body = "\n".join(out).strip() or t
    else:
        body = t
    if not body:
        body = t
    return {"subject": subject, "body": body}
