from fastapi import APIRouter

from app.api.v1 import auth, generation, health, job_descriptions, resumes

api_router = APIRouter()
api_router.include_router(health.router, prefix="/v1", tags=["health"])
api_router.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
api_router.include_router(resumes.router, prefix="/v1", tags=["resumes"])
api_router.include_router(job_descriptions.router, prefix="/v1", tags=["job_descriptions"])
api_router.include_router(generation.router, prefix="/v1", tags=["generation"])
