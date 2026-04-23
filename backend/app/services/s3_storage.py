from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlparse
from typing import Literal
from uuid import uuid4

from app.core.config import settings


UploadType = Literal["pdf", "docx"]


@dataclass(frozen=True)
class S3ObjectRef:
    bucket: str
    key: str

    @property
    def uri(self) -> str:
        return f"s3://{self.bucket}/{self.key}"


def _ext(upload_type: UploadType) -> str:
    return ".pdf" if upload_type == "pdf" else ".docx"


@lru_cache(maxsize=1)
def _s3_client():
    try:
        import boto3
    except Exception as e:
        raise RuntimeError("Missing dependency: boto3") from e

    return boto3.client("s3")


def put_resume_bytes(*, upload_type: UploadType, content_type: str | None, data: bytes) -> S3ObjectRef:
    if not settings.s3_bucket:
        raise ValueError("S3_BUCKET is required when UPLOAD_STORAGE=s3")

    bucket = settings.s3_bucket
    prefix = (settings.s3_prefix or "").lstrip("/")
    if prefix and not prefix.endswith("/"):
        prefix += "/"

    key = f"{prefix}{uuid4()}{_ext(upload_type)}"

    extra: dict = {}
    if content_type:
        extra["ContentType"] = content_type

    if settings.s3_sse:
        extra["ServerSideEncryption"] = settings.s3_sse
        if settings.s3_sse == "aws:kms" and settings.s3_kms_key_id:
            extra["SSEKMSKeyId"] = settings.s3_kms_key_id

    _s3_client().put_object(Bucket=bucket, Key=key, Body=data, **extra)
    return S3ObjectRef(bucket=bucket, key=key)


def delete_s3_uri(uri: str) -> None:
    parsed = urlparse(uri)
    if parsed.scheme != "s3" or not parsed.netloc or not parsed.path:
        raise ValueError("Invalid S3 URI")

    key = parsed.path.lstrip("/")
    _s3_client().delete_object(Bucket=parsed.netloc, Key=key)
