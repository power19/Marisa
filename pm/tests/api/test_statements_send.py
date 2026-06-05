"""Test that send_statement sets sent_at and calls email_service."""
import pytest
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_send_statement_sets_sent_at():
    from app.api.v1.routers.statements import send_statement
    from app.core.auth import CurrentUser

    user = CurrentUser(id=str(uuid.uuid4()), role="admin")
    owner_id = uuid.uuid4()
    statement_id = uuid.uuid4()

    owner = MagicMock()
    owner.id = owner_id
    owner.name = "Jane Owner"
    owner.email = "jane@example.com"

    statement = MagicMock()
    statement.id = statement_id
    statement.owner_id = owner_id
    statement.period_start = date(2026, 1, 1)
    statement.period_end = date(2026, 1, 31)
    statement.rent_collected = Decimal("2000")
    statement.mgmt_fee = Decimal("200")
    statement.net_payout = Decimal("1800")
    statement.currency = "USD"
    statement.pdf = "statements/test.pdf"
    statement.sent_at = None
    statement.created_at = None

    db = AsyncMock()
    stmt_result = MagicMock()
    stmt_result.scalar_one_or_none = MagicMock(return_value=statement)
    owner_result = MagicMock()
    owner_result.scalar_one_or_none = MagicMock(return_value=owner)

    call_count = 0
    async def mock_execute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return stmt_result
        return owner_result

    db.execute = mock_execute
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with patch("app.services.email_service.send_owner_statement") as mock_send, \
         patch("app.services.r2_service.public_url", return_value="https://example.com/stmt.pdf"):
        await send_statement(owner_id, statement_id, db, user)

    mock_send.assert_called_once_with(
        owner_email="jane@example.com",
        owner_name="Jane Owner",
        period_start=date(2026, 1, 1),
        period_end=date(2026, 1, 31),
        pdf_url="https://example.com/stmt.pdf",
    )
    assert statement.sent_at is not None


@pytest.mark.asyncio
async def test_send_statement_404_when_missing():
    from fastapi import HTTPException
    from app.api.v1.routers.statements import send_statement
    from app.core.auth import CurrentUser

    user = CurrentUser(id=str(uuid.uuid4()), role="admin")
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=None)
    db.execute.return_value = result

    with pytest.raises(HTTPException) as exc_info:
        await send_statement(uuid.uuid4(), uuid.uuid4(), db, user)
    assert exc_info.value.status_code == 404
