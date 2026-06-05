"""
Lease activation: generates one RentCharge per billing period between
lease.start_date and lease.end_date, with due_date = billing_day of that month.
"""
from datetime import date
from decimal import Decimal
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.lease import Lease, LeaseStatus
from ..models.rent_charge import RentCharge, ChargeStatus


def _periods(start: date, end: date, billing_day: int) -> list[tuple[date, date]]:
    """
    Yields (period_first_of_month, due_date) for each month between start and end.
    period = first day of each calendar month that overlaps the lease.
    due_date = billing_day of that period month, capped to end_date.
    """
    result = []
    # Start from the month of start_date
    year, month = start.year, start.month
    while True:
        period = date(year, month, 1)
        # Cap billing_day to last day of month (billing_day ≤ 28 so this is safe)
        due = date(year, month, billing_day)
        if period > end:
            break
        result.append((period, due))
        month += 1
        if month > 12:
            month = 1
            year += 1
    return result


async def activate_lease(lease_id: uuid.UUID, db: AsyncSession) -> Lease:
    result = await db.execute(select(Lease).where(Lease.id == lease_id))
    lease = result.scalar_one_or_none()
    if lease is None:
        raise ValueError(f"Lease {lease_id} not found")
    if lease.status != LeaseStatus.draft:
        raise ValueError(f"Lease {lease_id} is not in draft status")

    periods = _periods(lease.start_date, lease.end_date, lease.billing_day)
    for period, due_date in periods:
        charge = RentCharge(
            lease_id=lease.id,
            period=period,
            amount_due=lease.rent_amount,
            currency=lease.rent_currency.value,
            due_date=due_date,
            amount_paid=Decimal("0"),
            status=ChargeStatus.due,
        )
        db.add(charge)

    lease.status = LeaseStatus.active
    await db.commit()
    await db.refresh(lease)
    return lease
