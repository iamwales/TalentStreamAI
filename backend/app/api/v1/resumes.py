from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.core.db import create_document, get_document
from app.services.text_guardrails import normalize_user_text
from app.services.uploads import delete_saved_upload, extract_text, save_upload, validate_upload

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/resumes")
async def upload_resume(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, str]:
    try:
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > settings.max_upload_bytes:
                raise HTTPException(status_code=413, detail="File too large")
            chunks.append(chunk)
        raw = b"".join(chunks)

        def _process():
            detected_type = validate_upload(filename=file.filename or "", content_type=file.content_type, data=raw)
            extracted = extract_text(detected_type=detected_type, data=raw)
            extracted = normalize_user_text(extracted)
            if not extracted:
                return None, detected_type, ""

            saved = save_upload(
                detected_type=detected_type,
                owner_user_id=user.user_id,
                content_type=file.content_type,
                data=raw,
            )
            return saved, detected_type, extracted

        saved, detected_type, extracted = await run_in_threadpool(_process)
        if not extracted:
            raise HTTPException(status_code=400, detail="Could not extract text from resume")
        try:
            doc = await run_in_threadpool(
                create_document,
                kind="resume",
                owner_user_id=user.user_id,
                text=extracted,
                filename=file.filename,
                content_type=file.content_type,
                file_path=saved.path if saved else None,
                meta={"bytes": len(raw), "detected_type": detected_type},
            )
        except Exception:
            try:
                await run_in_threadpool(delete_saved_upload, saved.path if saved else None)
            except Exception:
                logger.exception("Failed to clean up uploaded resume after DB insert failure")
            raise
        return {"resume_id": doc.id}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/resumes/{resume_id}")
def get_resume(
    resume_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, str | None]:
    doc = get_document(doc_id=resume_id, owner_user_id=user.user_id)
    if not doc or doc.kind != "resume":
        raise HTTPException(status_code=404, detail="Resume not found")
    return {
        "resume_id": doc.id,
        "filename": doc.filename,
        "content_type": doc.content_type,
        "created_at": doc.created_at,
    }
