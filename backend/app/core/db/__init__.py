from __future__ import annotations

from app.core.config import settings

if settings.db_backend == "postgres":
    from app.core.db.postgres_impl import (  # noqa: F401
        ApplicationRecord,
        StoredDocument,
        UserProfile,
        create_application,
        create_document,
        dashboard_aggregates,
        get_application,
        get_conn,
        get_document,
        get_user_profile,
        list_applications,
        list_documents,
        init_db,
        update_document_meta,
        upsert_user_profile,
    )
else:
    from app.core.db.sqlite_impl import (  # noqa: F401
        ApplicationRecord,
        StoredDocument,
        UserProfile,
        create_application,
        create_document,
        dashboard_aggregates,
        get_application,
        get_conn,
        get_document,
        get_user_profile,
        list_applications,
        list_documents,
        init_db,
        update_document_meta,
        upsert_user_profile,
    )

__all__ = [
    "ApplicationRecord",
    "StoredDocument",
    "UserProfile",
    "create_application",
    "create_document",
    "dashboard_aggregates",
    "get_application",
    "get_conn",
    "get_document",
    "get_user_profile",
    "init_db",
    "list_applications",
    "list_documents",
    "update_document_meta",
    "upsert_user_profile",
]
