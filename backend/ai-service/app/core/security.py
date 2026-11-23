"""Service-to-service authentication via a shared internal token."""
from __future__ import annotations

import hmac

from fastapi import Depends, Header

from app.core.config import Settings, get_settings
from app.core.errors import UnauthorizedError


def require_internal_token(
    x_internal_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    """Rejects requests without the gateway's token. Disabled only when no token is configured
    (local development); production startup refuses an empty token."""
    expected = settings.internal_token
    if not expected:
        return
    if not x_internal_token or not hmac.compare_digest(x_internal_token, expected):
        raise UnauthorizedError("Missing or invalid internal token")
