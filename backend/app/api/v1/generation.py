from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.db import get_document
from app.services.langgraph.streaming_agent import stream_generation
from app.services.text_guardrails import normalize_user_text

router = APIRouter()
logger = logging.getLogger(__name__)


class GenerateRequest(BaseModel):
    resume_id: str | None = None
    job_description_id: str | None = None
    resume_text: str | None = Field(default=None, max_length=500_000)
    job_description_text: str | None = Field(default=None, max_length=500_000)


@router.post("/generate/stream")
async def generate_stream(
    payload: GenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    resume_text = payload.resume_text
    if payload.resume_id:
        doc = await run_in_threadpool(
            get_document,
            doc_id=payload.resume_id,
            owner_user_id=user.user_id,
        )
        if not doc or doc.kind != "resume":
            raise HTTPException(status_code=404, detail="Resume not found")
        resume_text = doc.text

    jd_text = payload.job_description_text
    if payload.job_description_id:
        doc = await run_in_threadpool(
            get_document,
            doc_id=payload.job_description_id,
            owner_user_id=user.user_id,
        )
        if not doc or doc.kind != "job_description":
            raise HTTPException(status_code=404, detail="Job description not found")
        jd_text = doc.text

    resume_text = normalize_user_text(resume_text or "")
    jd_text = normalize_user_text(jd_text or "")
    if not resume_text:
        raise HTTPException(status_code=400, detail="Missing resume text")
    if not jd_text:
        raise HTTPException(status_code=400, detail="Missing job description text")

    async def event_stream():
        try:
            async for line in stream_generation(resume_text=resume_text, job_description_text=jd_text):
                yield f"{line}\n\n"
        except Exception:
            logger.exception("Generation stream failed")
            yield 'event: error\ndata: {"message":"generation_failed"}\n\n'

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
