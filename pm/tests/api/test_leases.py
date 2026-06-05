"""API-level tests for lease creation and activation."""
import pytest
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    from app.main import app
    return TestClient(app)


def _auth_headers():
    # In tests, we patch get_current_user so the token value doesn't matter
    return {"Authorization": "Bearer test-token"}


@pytest.mark.asyncio
async def test_activate_lease_generates_charges():
    """Service-level: activating a draft lease creates the right number of charges."""
    from app.services.lease_service import _periods, activate_lease
    from app.models.lease import LeaseStatus

    # 3-month lease, billing_day=5
    lease = MagicMock()
    lease.id = uuid.uuid4()
    lease.start_date = date(2026, 1, 1)
    lease.end_date = date(2026, 3, 31)
    lease.rent_amount = Decimal("1500.00")
    lease.rent_currency = MagicMock(value="USD")
    lease.billing_day = 5
    lease.status = LeaseStatus.draft

    added_charges = []

    db = AsyncMock()
    db.execute.return_value.scalar_one_or_none = MagicMock(return_value=lease)
    db.add = MagicMock(side_effect=lambda x: added_charges.append(x))
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    result = await activate_lease(lease.id, db)

    assert lease.status == LeaseStatus.active
    assert len(added_charges) == 3
    # All charges should have correct amount
    for ch in added_charges:
        assert ch.amount_due == Decimal("1500.00")
        assert ch.currency == "USD"


@pytest.mark.asyncio
async def test_cannot_activate_non_draft_lease():
    """Activating a non-draft lease raises ValueError."""
    from app.services.lease_service import activate_lease
    from app.models.lease import LeaseStatus

    lease = MagicMock()
    lease.id = uuid.uuid4()
    lease.status = LeaseStatus.active

    db = AsyncMock()
    db.execute.return_value.scalar_one_or_none = MagicMock(return_value=lease)

    with pytest.raises(ValueError, match="not in draft"):
        await activate_lease(lease.id, db)
