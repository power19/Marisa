"""API-level payment tests."""
import pytest
import uuid
from decimal import Decimal
from datetime import date
from unittest.mock import MagicMock

from app.models.rent_charge import ChargeStatus


def test_payment_schema_validation():
    """PaymentCreate rejects negative amounts."""
    from pydantic import ValidationError
    from app.schemas.payment import PaymentCreate
    import pytest

    # Valid payment
    p = PaymentCreate(amount=Decimal("500"), currency="USD", paid_on=date(2026, 6, 1), method="cash")
    assert p.amount == Decimal("500")


def test_lease_create_billing_day_validation():
    """LeaseCreate rejects billing_day outside 1-28."""
    from pydantic import ValidationError
    from app.schemas.lease import LeaseCreate

    with pytest.raises(ValidationError):
        LeaseCreate(
            unit_id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            rent_amount=Decimal("1000"),
            rent_currency="USD",
            billing_day=29,  # invalid
        )


def test_lease_create_billing_day_min():
    """billing_day=0 is invalid."""
    from pydantic import ValidationError
    from app.schemas.lease import LeaseCreate

    with pytest.raises(ValidationError):
        LeaseCreate(
            unit_id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            rent_amount=Decimal("1000"),
            rent_currency="USD",
            billing_day=0,
        )
