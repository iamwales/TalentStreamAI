from __future__ import annotations

import json
import os
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.core.config import settings


def _ensure_parent_dir(path: str) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def get_conn() -> sqlite3.Connection:
    _ensure_parent_dir(settings.sqlite_path)
    conn = sqlite3.connect(settings.sqlite_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute(f"PRAGMA busy_timeout={int(settings.sqlite_busy_timeout_ms)}")
    conn.execute("PRAGMA foreign_keys=ON")
    if settings.sqlite_enable_wal:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def init_db() -> None:
    conn = get_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              kind TEXT NOT NULL,
              owner_user_id TEXT NOT NULL,
              filename TEXT,
              content_type TEXT,
              file_path TEXT,
              text TEXT NOT NULL,
              created_at TEXT NOT NULL,
              meta_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind)")
        conn.commit()
    finally:
        conn.close()


@dataclass(frozen=True)
class StoredDocument:
    id: str
    kind: str
    owner_user_id: str
    filename: str | None
    content_type: str | None
    file_path: str | None
    text: str
    created_at: str
    meta: dict[str, Any]


def create_document(
    *,
    kind: str,
    owner_user_id: str,
    text: str,
    filename: str | None = None,
    content_type: str | None = None,
    file_path: str | None = None,
    meta: dict[str, Any] | None = None,
) -> StoredDocument:
    doc_id = str(uuid4())
    created_at = datetime.now(UTC).isoformat()
    meta_json = json.dumps(meta or {}, ensure_ascii=True)

    conn = get_conn()
    try:
        conn.execute(
            """
            INSERT INTO documents (
              id, kind, owner_user_id, filename, content_type, file_path, text, created_at, meta_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, kind, owner_user_id, filename, content_type, file_path, text, created_at, meta_json),
        )
        conn.commit()
    finally:
        conn.close()

    return StoredDocument(
        id=doc_id,
        kind=kind,
        owner_user_id=owner_user_id,
        filename=filename,
        content_type=content_type,
        file_path=file_path,
        text=text,
        created_at=created_at,
        meta=meta or {},
    )


def get_document(*, doc_id: str, owner_user_id: str) -> StoredDocument | None:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND owner_user_id = ? LIMIT 1",
            (doc_id, owner_user_id),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        return None

    meta = json.loads(row["meta_json"]) if row["meta_json"] else {}
    return StoredDocument(
        id=row["id"],
        kind=row["kind"],
        owner_user_id=row["owner_user_id"],
        filename=row["filename"],
        content_type=row["content_type"],
        file_path=row["file_path"],
        text=row["text"],
        created_at=row["created_at"],
        meta=meta,
    )
