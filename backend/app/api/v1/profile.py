from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.schemas.frontend import (
    ProfileOut,
    ProfilePatchIn,
    ResumeOut,
    map_profile,
    map_resume,
)
from app.core.auth import AuthenticatedUser, get_current_user
from app.core.db import get_document, get_user_profile, upsert_user_profile
from app.services.ingest_resume import ingest_uploaded_resume

router = APIRouter()
log = structlog.get_logger(__name__)


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: AuthenticatedUser = Depends(get_current_user)) -> ProfileOut:
    p = get_user_profile(user_id=user.user_id)
    return map_profile(user.user_id, p, user.claims)


@router.patch("/profile", response_model=ProfileOut)
def patch_profile(
    body: ProfilePatchIn,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ProfileOut:
    doc = get_document(doc_id=body.base_resume_id, owner_user_id=user.user_id)
    if not doc or doc.kind != "resume":
        raise HTTPException(status_code=404, detail="Resume not found")
    claims = user.claims
    existing = get_user_profile(user_id=user.user_id)
    if existing is None:
        upsert_user_profile(
            user_id=user.user_id,
            email=str(claims.get("email") or ""),
            full_name=str(claims.get("name") or ""),
            headline=None,
            base_resume_id=body.base_resume_id,
        )
    else:
        upsert_user_profile(
            user_id=user.user_id,
            base_resume_id=body.base_resume_id,
        )
    p = get_user_profile(user_id=user.user_id)
    return map_profile(user.user_id, p, user.claims)


@router.post("/profile/base-resume", response_model=ResumeOut)
async def upload_base_resume(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> ResumeOut:
    try:
        res = await ingest_uploaded_resume(
            file=file, user=user, set_as_base=True
        )
    except HTTPException:
        raise
    except Exception as e:
        log.exception("base_resume_upload_failed")
        raise HTTPException(status_code=500, detail="Failed to store resume") from e
    p = get_user_profile(user_id=user.user_id)
    is_base = bool(p and p.base_resume_id == res.document.id)
    return map_resume(
        res.document, is_base=is_base, application_id=None
    )
