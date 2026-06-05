"""Tests for owner statement generation."""
import sys
import types
import pytest
import uuid
from decimal import Decimal
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

# Stub weasyprint before any service is imported
if "weasyprint" not in sys.modules:
    _fake_wp = types.ModuleType("weasyprint")
    _fake_wp.HTML = MagicMock()
    sys.modules["weasyprint"] = _fake_wp

import app.services.r2_service  # ensure module is registered for patching


def _make_payment(amount, paid_on, currency="USD"):
    p = MagicMock()
    p.amount = Decimal(str(amount))
    p.paid_on = paid_on
    p.currency = currency
    return p


def _make_charge(period, payments):
    c = MagicMock()
    c.period = period
    c.payments = payments
    return c


def _make_lease(charges):
    l = MagicMock()
    l.charges = charges
    return l


@pytest.mark.asyncio
async def test_statement_totals():
    """Statement rent_collected, mgmt_fee, net_payout are correct."""
    from app.schemas.owner_statement import OwnerStatementCreate
    from app.services.statement_service import generate_statement

    owner_id = uuid.uuid4()
    owner = MagicMock()
    owner.id = owner_id
    owner.name = "Test Owner"
    owner.email = "owner@example.com"

    p1 = _make_payment(1000, date(2026, 1, 10))
    p2 = _make_payment(1000, date(2026, 2, 8))
    charge1 = _make_charge(date(2026, 1, 1), [p1])
    charge2 = _make_charge(date(2026, 2, 1), [p2])
    lease = _make_lease([charge1, charge2])

    unit = MagicMock()
    unit.id = uuid.uuid4()
    unit.label = "Unit A"
    unit.owner_id = owner_id

    db = AsyncMock()

    # Mock DB queries
    owner_result = MagicMock()
    owner_result.scalar_one_or_none = MagicMock(return_value=owner)
    units_result = MagicMock()
    units_result.scalars.return_value.all = MagicMock(return_value=[unit])
    leases_result = MagicMock()
    leases_result.scalars.return_value.all = MagicMock(return_value=[lease])

    call_count = 0
    async def mock_execute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return owner_result
        elif call_count == 2:
            return units_result
        else:
            return leases_result

    db.execute = mock_execute
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    data = OwnerStatementCreate(
        period_start=date(2026, 1, 1),
        period_end=date(2026, 2, 28),
        mgmt_fee_pct=Decimal("10"),
        currency="USD",
    )

    with patch("app.services.r2_service.upload_bytes", return_value="statements/test.pdf"):
        stmt = await generate_statement(owner_id, data, db)

    assert stmt.rent_collected == Decimal("2000.00")
    assert stmt.mgmt_fee == Decimal("200.00")
    assert stmt.net_payout == Decimal("1800.00")
