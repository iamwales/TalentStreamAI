from __future__ import annotations

import os
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Literal
from uuid import uuid4
import zipfile

from app.core.config import settings
from app.services.s3_storage import delete_s3_uri, put_resume_bytes


UploadKind = Literal["resume"]


@dataclass(frozen=True)
class SavedUpload:
    path: str | None
    bytes_written: int
    detected_type: str


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def detect_upload_type(*, filename: str, content_type: str | None, head: bytes) -> str:
    name = filename.lower()
    ct = (content_type or "").lower()

    if head.startswith(b"%PDF-") or ct == "application/pdf" or name.endswith(".pdf"):
        return "pdf"

    if head.startswith(b"PK\x03\x04") and (name.endswith(".docx") or "wordprocessingml.document" in ct):
        return "docx"

    if name.endswith(".docx"):
        return "docx"
    if name.endswith(".pdf"):
        return "pdf"

    raise ValueError("Unsupported file type (expected PDF or DOCX)")


def validate_upload(*, filename: str, content_type: str | None, data: bytes) -> str:
    if len(data) > settings.max_upload_bytes:
        raise ValueError("File too large")
    if not filename:
        raise ValueError("Missing filename")

    return detect_upload_type(filename=filename, content_type=content_type, head=data[:16])


def save_upload(*, detected_type: str, owner_user_id: str, content_type: str | None, data: bytes) -> SavedUpload:
    if len(data) > settings.max_upload_bytes:
        raise ValueError("File too large")

    storage = (settings.upload_storage or "none").lower()
    if storage == "none":
        return SavedUpload(path=None, bytes_written=len(data), detected_type=detected_type)

    if storage == "s3":
        ref = put_resume_bytes(upload_type=detected_type, content_type=content_type, data=data)
        return SavedUpload(path=ref.uri, bytes_written=len(data), detected_type=detected_type)

    if storage != "local":
        raise ValueError("UPLOAD_STORAGE must be one of: none, local, s3")

    root = Path(settings.upload_dir)
    _ensure_dir(str(root))
    user_dir = root / owner_user_id
    _ensure_dir(str(user_dir))

    ext = ".pdf" if detected_type == "pdf" else ".docx"
    safe_name = f"{uuid4()}{ext}"
    path = str(user_dir / safe_name)
    with open(path, "wb") as f:
        f.write(data)

    return SavedUpload(path=path, bytes_written=len(data), detected_type=detected_type)


def delete_saved_upload(path: str | None) -> None:
    if not path:
        return

    if path.startswith("s3://"):
        delete_s3_uri(path)
        return

    os.remove(path)


def extract_text(*, detected_type: str, data: bytes) -> str:
    if detected_type == "pdf":
        try:
            from pypdf import PdfReader
        except Exception as e:
            raise RuntimeError("Missing dependency: pypdf") from e

        try:
            reader = PdfReader(BytesIO(data))
            parts: list[str] = []
            for page in reader.pages:
                txt = page.extract_text() or ""
                if txt:
                    parts.append(txt)
            return "\n\n".join(parts).strip()
        except Exception as e:
            raise ValueError("Invalid PDF file") from e

    if detected_type == "docx":
        try:
            from docx import Document
        except Exception as e:
            raise RuntimeError("Missing dependency: python-docx") from e

        try:
            with zipfile.ZipFile(BytesIO(data)) as zf:
                total_uncompressed = sum(i.file_size for i in zf.infolist())
                if total_uncompressed > 20 * 1024 * 1024:
                    raise ValueError("DOCX is too large after decompression")
        except zipfile.BadZipFile as e:
            raise ValueError("Invalid DOCX file") from e

        try:
            doc = Document(BytesIO(data))
            parts = [p.text for p in doc.paragraphs if (p.text or "").strip()]
            return "\n".join(parts).strip()
        except Exception as e:
            raise ValueError("Invalid DOCX file") from e

    raise RuntimeError("Unsupported detected_type")
