from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.jwks import ClerkJwtVerifier


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    claims: dict[str, Any]


_bearer = HTTPBearer(auto_error=False)
_verifier = ClerkJwtVerifier()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthenticatedUser:
    if settings.auth_mode == "disabled":
        return AuthenticatedUser(user_id="anonymous", claims={"auth_mode": "disabled"})

    if settings.auth_mode != "clerk_jwks":
        raise HTTPException(status_code=500, detail="Unsupported AUTH_MODE configuration")

    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = credentials.credentials
    try:
        claims = _verifier.verify(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e

    user_id = str(claims.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token (missing subject)")

    return AuthenticatedUser(user_id=user_id, claims=claims)
