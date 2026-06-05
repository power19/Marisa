"""
Charge status computation. Called after any payment is recorded,
and by the worker to mark overdue charges.
"""
from datetime import date
from decimal import Decimal
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.rent_charge import RentCharge, ChargeStatus


def compute_status(charge: RentCharge, today: date | None = None) -> ChargeStatus:
    if charge.status == ChargeStatus.waived:
        return ChargeStatus.waived
    today = today or date.today()
    paid = charge.amount_paid
    due = charge.amount_due
    if paid >= due:
        return ChargeStatus.paid
    if paid > Decimal("0"):
        return ChargeStatus.partial
    if today > charge.due_date:
        return ChargeStatus.overdue
    return ChargeStatus.due


async def refresh_charge_status(charge: RentCharge, db: AsyncSession) -> RentCharge:
    new_status = compute_status(charge)
    if charge.status != new_status:
        charge.status = new_status
        await db.commit()
        await db.refresh(charge)
    return charge


async def mark_overdue_charges(db: AsyncSession) -> int:
    """Update all unpaid charges past their due_date to overdue. Returns count updated."""
    today = date.today()
    result = await db.execute(
        select(RentCharge).where(
            RentCharge.due_date < today,
            RentCharge.status.in_([ChargeStatus.due, ChargeStatus.partial]),
        )
    )
    charges = result.scalars().all()
    count = 0
    for charge in charges:
        new_status = compute_status(charge, today)
        if charge.status != new_status:
            charge.status = new_status
            count += 1
    if count:
        await db.commit()
    return count
