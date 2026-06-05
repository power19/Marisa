"""
Test configuration. Uses an in-memory SQLite-compatible approach for unit tests —
but since we use Postgres-specific types (UUID, Enum with schema), we mock the DB
session and test service logic directly.
"""
import pytest
import uuid
from decimal import Decimal
from datetime import date
from unittest.mock import AsyncMock, MagicMock


def make_lease(
    start_date=date(2026, 1, 1),
    end_date=date(2026, 3, 31),
    rent_amount=Decimal("1000.00"),
    rent_currency="USD",
    billing_day=5,
    status="draft",
) -> MagicMock:
    lease = MagicMock()
    lease.id = uuid.uuid4()
    lease.start_date = start_date
    lease.end_date = end_date
    lease.rent_amount = rent_amount
    lease.rent_currency = MagicMock(value=rent_currency)
    lease.billing_day = billing_day
    lease.status = status
    return lease
