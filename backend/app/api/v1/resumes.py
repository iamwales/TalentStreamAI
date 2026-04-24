from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.schemas.frontend import ResumeOut, map_resume
from app.core.auth import AuthenticatedUser, get_current_user
from app.core.db import get_document, get_user_profile, list_documents
from app.services.ingest_resume import ingest_uploaded_resume

router = APIRouter()
log = structlog.get_logger(__name__)


@router.get("/resumes", response_model=list[ResumeOut])
def list_resumes(
    user: AuthenticatedUser = Depends(get_current_user),
) -> list[ResumeOut]:
    p = get_user_profile(user_id=user.user_id)
    base_id = p.base_resume_id if p else None
    docs = list_documents(owner_user_id=user.user_id, kind="resume")
    out: list[ResumeOut] = []
    for d in docs:
        is_base = base_id is not None and d.id == base_id
        out.append(map_resume(d, is_base=is_base, application_id=d.meta.get("application_id")))
    return out


@router.get("/resumes/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ResumeOut:
    p = get_user_profile(user_id=user.user_id)
    base_id = p.base_resume_id if p else None
    doc = get_document(doc_id=resume_id, owner_user_id=user.user_id)
    if not doc or doc.kind != "resume":
        raise HTTPException(status_code=404, detail="Resume not found")
    is_base = base_id is not None and doc.id == base_id
    return map_resume(
        doc, is_base=is_base, application_id=doc.meta.get("application_id")
    )


@router.post("/resumes", response_model=ResumeOut)
async def upload_resume(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> ResumeOut:
    try:
        res = await ingest_uploaded_resume(
            file=file, user=user, set_as_base=False
        )
    except HTTPException:
        raise
    except Exception as e:
        log.exception("resume_upload_failed")
        raise HTTPException(status_code=500, detail="Failed to store resume") from e
    p = get_user_profile(user_id=user.user_id)
    base_id = p.base_resume_id if p else None
    is_base = base_id is not None and res.document.id == base_id
    return map_resume(
        res.document, is_base=is_base, application_id=None
    )
