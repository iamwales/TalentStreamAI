from __future__ import annotations

from pydantic import BaseModel, Field


class GapAnalysis(BaseModel):
    missing_keywords: list[str] = Field(default_factory=list, max_length=50)
    matched_keywords: list[str] = Field(default_factory=list, max_length=50)
    summary: str = Field(default="", max_length=2000)


class TextArtifact(BaseModel):
    content: str = Field(min_length=1, max_length=500_000)
