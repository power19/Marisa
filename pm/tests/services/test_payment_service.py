"""Tests for payment recording logic (mocked DB)."""
import pytest
import uuid
from decimal import Decimal
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import app.services.payment_service  # ensure submodule is registered for patching
import app.services.receipt_service  # ensure submodule is registered for patching
from app.schemas.payment import PaymentCreate
from app.models.rent_charge import ChargeStatus


@pytest.mark.asyncio
async def test_record_payment_updates_status():
    """Recording a full payment should set charge status to paid."""
    charge_id = uuid.uuid4()
    charge = MagicMock()
    charge.id = charge_id
    charge.amount_due = Decimal("1000.00")
    charge.amount_paid = Decimal("0.00")
    charge.status = ChargeStatus.due
    charge.due_date = date(2026, 6, 10)

    lease = MagicMock()
    lease.tenant = MagicMock(name="Test Tenant")
    lease.unit = MagicMock(label="Unit A")
    charge.lease = lease

    db = AsyncMock()
    db.execute = AsyncMock()
    db.execute.return_value.scalar_one_or_none = MagicMock(return_value=charge)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    data = PaymentCreate(
        amount=Decimal("1000.00"),
        currency="USD",
        paid_on=date(2026, 6, 5),
        method="bank",
    )

    with patch("app.services.payment_service.receipt_service.generate_receipt", return_value="receipts/test.pdf"):
        from app.services.payment_service import record_payment
        payment = await record_payment(charge_id, data, "agent-uuid", db)

    assert charge.amount_paid == Decimal("1000.00")
    assert charge.status == ChargeStatus.paid


@pytest.mark.asyncio
async def test_record_partial_payment():
    """Partial payment should set charge status to partial."""
    charge_id = uuid.uuid4()
    charge = MagicMock()
    charge.id = charge_id
    charge.amount_due = Decimal("1000.00")
    charge.amount_paid = Decimal("0.00")
    charge.status = ChargeStatus.due
    charge.due_date = date(2026, 6, 10)

    lease = MagicMock()
    lease.tenant = MagicMock()
    lease.unit = MagicMock()
    charge.lease = lease

    db = AsyncMock()
    db.execute.return_value.scalar_one_or_none = MagicMock(return_value=charge)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    data = PaymentCreate(
        amount=Decimal("500.00"),
        currency="USD",
        paid_on=date(2026, 6, 5),
        method="cash",
    )

    with patch("app.services.payment_service.receipt_service.generate_receipt", return_value="receipts/test.pdf"):
        from app.services.payment_service import record_payment
        payment = await record_payment(charge_id, data, "agent-uuid", db)

    assert charge.amount_paid == Decimal("500.00")
    assert charge.status == ChargeStatus.partial


@pytest.mark.asyncio
async def test_cannot_pay_already_paid_charge():
    """Paying an already-paid charge raises ValueError."""
    charge_id = uuid.uuid4()
    charge = MagicMock()
    charge.id = charge_id
    charge.status = ChargeStatus.paid
    charge.amount_paid = Decimal("1000.00")
    charge.amount_due = Decimal("1000.00")

    db = AsyncMock()
    db.execute.return_value.scalar_one_or_none = MagicMock(return_value=charge)

    data = PaymentCreate(
        amount=Decimal("100.00"),
        currency="USD",
        paid_on=date(2026, 6, 5),
        method="cash",
    )

    from app.services.payment_service import record_payment
    with pytest.raises(ValueError, match="already paid"):
        await record_payment(charge_id, data, "agent-uuid", db)
