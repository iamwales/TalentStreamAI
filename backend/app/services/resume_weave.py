"""
Deterministic (no-LLM) weaving of target keywords into resume text for AGENT_MODE=stub.
"""

from __future__ import annotations

import re
from collections import Counter
from typing import Any

# JD / general tokens to ignore when building “missing keyword” and weave lists
_JD_STOP_EXTRA: frozenset[str] = frozenset(
    {
        "need",
        "must",
        "should",
        "could",
        "would",
        "including",
        "relevant",
        "position",
        "looking",
        "seeking",
        "hiring",
        "job",
        "open",
        "posting",
        "description",
        "responsibilities",
        "requirements",
        "qualifications",
        "ability",
        "able",
    }
)

# Tokens that are not useful to "weave" as stand-alone resume keywords
_STOP: frozenset[str] = frozenset(
    {
        "the",
        "and",
        "for",
        "with",
        "you",
        "are",
        "this",
        "that",
        "from",
        "not",
        "can",
        "have",
        "was",
        "will",
        "your",
        "has",
        "all",
        "but",
        "get",
        "out",
        "new",
        "more",
        "our",
        "into",
        "over",
        "any",
        "per",
        "one",
        "add",
        "end",
        "set",
        "use",
        "useful",
        "work",
        "time",
        "just",
        "like",
        "code",
        "make",
        "way",
        "day",
        "its",
        "here",
        "then",
        "most",
        "very",
        "only",
        "other",
        "when",
        "where",
        "while",
        "using",
        "able",
        "worked",
        "workings",
        "large",
    }
) | _JD_STOP_EXTRA

KEYWORD_STOPWORDS: frozenset[str] = _STOP


def top_keywords_from_text(
    text: str,
    *,
    k: int = 40,
    min_len: int = 3,
) -> list[str]:
    """
    Frequent alnum tokens from a body of text (job description, etc.), for gap analysis.
    Splits on punctuation so 'systems.We' does not become 'systemswe'.
    """
    toks = re.findall(r"[a-z0-9]+", (text or "").lower())
    filtered: list[str] = []
    for w in toks:
        if len(w) < min_len:
            continue
        if w in _STOP:
            continue
        filtered.append(w)
    return [w for w, _ in Counter(filtered).most_common(k)]


def _normalize_kw(s: str) -> str:
    t = s.strip()
    t = re.sub(r"\s+", " ", t)
    return t


def _word_boundary_in_text(word: str, text: str) -> bool:
    if not word or not text:
        return False
    return re.search(rf"(?<!\w){re.escape(word)}(?!\w)", text, re.IGNORECASE) is not None


def filter_substantive_keywords(
    words: list[str] | None,
    *,
    resume_text: str,
    min_len: int = 3,
    max_count: int = 18,
) -> list[str]:
    """Drop stopwords, short noise, and terms that already appear in the resume (whole-word)."""
    if not words:
        return []
    resume = resume_text or ""
    out: list[str] = []
    for raw in words:
        w = _normalize_kw(str(raw).lower().strip(".,:;!\"'()[]{}"))
        if len(w) < min_len:
            continue
        if w in _STOP:
            continue
        if _word_boundary_in_text(w, resume):
            continue
        if w not in {x.lower() for x in out}:
            out.append(w)
    return out[:max_count]


def _jd_phrase_hint(jd: str, *, max_words: int = 22) -> str:
    t = re.sub(r"\s+", " ", (jd or "").replace("\n", " ")).strip()
    if not t:
        return "the target role and its technical expectations"
    words = t.split()[:max_words]
    if not words:
        return "the target role and its technical expectations"
    frag = " ".join(words)
    if len(frag) > 220:
        return frag[:217].rstrip() + "…"
    return frag


def weave_keywords_stub(
    resume_text: str,
    missing_keywords: list[str] | Any,
    job_description_text: str,
) -> str:
    """
    Returns full resume text with missing terms woven in as natural copy (no scaffold header,
    no 'keywords to weave' list). Appends 1–2 short professional paragraphs.
    """
    r = (resume_text or "").rstrip()
    m = missing_keywords
    if not isinstance(m, list):
        m = []
    to_weave = filter_substantive_keywords(
        [str(x) for x in m], resume_text=r, min_len=4, max_count=20
    )
    if not to_weave:
        to_weave = filter_substantive_keywords(
            [str(x) for x in m], resume_text=r, min_len=3, max_count=20
        )
    if not to_weave:
        return r

    jd_hint = _jd_phrase_hint(job_description_text)

    n = len(to_weave)
    half = max(1, n // 2)
    a = to_weave[:half]
    b = to_weave[half:]

    def _phrase(xs: list[str]) -> str:
        if not xs:
            return ""
        if len(xs) == 1:
            return xs[0]
        if len(xs) == 2:
            return f"{xs[0]} and {xs[1]}"
        return ", ".join(xs[:-1]) + f", and {xs[-1]}"

    if n <= 10:
        body = _phrase(to_weave)
        block = (
            f"Role alignment: this version weaves the job’s stated priorities ({jd_hint}) into the narrative, "
            f"with explicit alignment to {body}, using language that mirrors the posting while staying consistent with the experience above."
        )
        return f"{r}\n\n{block}\n"

    p1 = (
        f"Role alignment: phrasing reflects the posting’s focus on {jd_hint}. "
        f"Highlighted areas include {_phrase(a)} in line with the role’s published expectations."
    )
    p2 = (
        f"Further emphasis is placed on {_phrase(b)} — using vocabulary aligned to the job description while staying consistent with the experience above."
    )

    return f"{r}\n\n{p1}\n\n{p2}\n"
