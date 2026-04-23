import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.db import init_db
from app.services.llm.client import close_llm_http_clients

app = FastAPI(
    title="TalentStreamAI API",
    version="0.1.0",
    description="Backend service for the TalentStreamAI capstone (FastAPI + future LangGraph agents).",
)

@app.on_event("startup")
def _startup() -> None:
    init_db()

    def _running_in_aws() -> bool:
        return bool(
            os.environ.get("AWS_EXECUTION_ENV")
            or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
            or os.environ.get("ECS_CONTAINER_METADATA_URI_V4")
            or os.environ.get("ECS_CONTAINER_METADATA_URI")
        )

    env = (settings.deployment_environment or "").lower()
    prod_like = env in {"prod", "production", "staging"} or _running_in_aws()
    if prod_like and settings.auth_mode == "disabled":
        raise RuntimeError("Refusing to start with AUTH_MODE=disabled in a deployed environment.")

    if settings.auth_mode == "clerk_jwks":
        if not settings.clerk_jwks_url or not settings.clerk_issuer:
            raise RuntimeError("AUTH_MODE=clerk_jwks requires CLERK_JWKS_URL and CLERK_ISSUER.")

    if prod_like and settings.agent_mode != "llm":
        raise RuntimeError("Refusing to start with AGENT_MODE!=llm in a deployed environment.")

    upload_storage = (settings.upload_storage or "").lower()
    if prod_like and upload_storage != "s3":
        raise RuntimeError("Refusing to start with UPLOAD_STORAGE!=s3 in a deployed environment.")

    if upload_storage == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("UPLOAD_STORAGE=s3 requires S3_BUCKET.")

        if settings.s3_sse not in {"AES256", "aws:kms"}:
            raise RuntimeError("S3_SSE must be either AES256 or aws:kms.")

        if settings.s3_sse == "aws:kms" and not settings.s3_kms_key_id:
            raise RuntimeError("S3_SSE=aws:kms requires S3_KMS_KEY_ID.")


@app.on_event("shutdown")
async def _shutdown() -> None:
    await close_llm_http_clients()


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "talentstreamai-api", "docs": "/docs"}
