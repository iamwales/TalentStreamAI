from fastapi import APIRouter

from app.api.v1 import (
    applications,
    auth,
    dashboard,
    generation,
    health,
    job_descriptions,
    observability,
    profile,
    resumes,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/v1", tags=["health"])
api_router.include_router(observability.router, prefix="/v1", tags=["observability"])
api_router.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
api_router.include_router(profile.router, prefix="/v1", tags=["profile"])
api_router.include_router(dashboard.router, prefix="/v1", tags=["dashboard"])
api_router.include_router(applications.router, prefix="/v1", tags=["applications"])
api_router.include_router(resumes.router, prefix="/v1", tags=["resumes"])
api_router.include_router(job_descriptions.router, prefix="/v1", tags=["job_descriptions"])
api_router.include_router(generation.router, prefix="/v1", tags=["generation"])
