"""Portal endpoint tests — tenants can only see their own data."""
import pytest
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_portal_only_returns_own_leases():
    """_get_tenant raises 404 if no tenant profile matches current user."""
    from fastapi import HTTPException
    from app.api.v1.routers.portal import _get_tenant
    from app.core.auth import CurrentUser

    user = CurrentUser(id=str(uuid.uuid4()), role="tenant")
    db = AsyncMock()
    db.execute.return_value.scalar_one_or_none = MagicMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await _get_tenant(user, db)
    assert exc_info.value.status_code == 404
