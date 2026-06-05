"""
Record a payment against a charge; update charge status; generate receipt PDF.
"""
import uuid
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..models.rent_charge import RentCharge, ChargeStatus
from ..models.payment import Payment
from ..models.lease import Lease
from ..models.tenant import Tenant
from ..models.unit import Unit
from ..schemas.payment import PaymentCreate
from .charge_service import compute_status
from . import receipt_service


async def record_payment(
    charge_id: uuid.UUID,
    data: PaymentCreate,
    recorded_by: str,
    db: AsyncSession,
) -> Payment:
    result = await db.execute(
        select(RentCharge)
        .where(RentCharge.id == charge_id)
        .options(
            selectinload(RentCharge.lease).selectinload(Lease.tenant),
            selectinload(RentCharge.lease).selectinload(Lease.unit),
        )
    )
    charge = result.scalar_one_or_none()
    if charge is None:
        raise ValueError(f"Charge {charge_id} not found")
    if charge.status in (ChargeStatus.paid, ChargeStatus.waived):
        raise ValueError(f"Charge {charge_id} is already {charge.status.value}")

    payment = Payment(
        charge_id=charge.id,
        amount=data.amount,
        currency=data.currency,
        paid_on=data.paid_on,
        method=data.method,
        recorded_by=recorded_by,
    )
    db.add(payment)

    # Update running total and recompute status
    charge.amount_paid = (charge.amount_paid or Decimal("0")) + data.amount
    charge.status = compute_status(charge)

    await db.flush()  # get payment.id before generating receipt

    # Generate receipt PDF
    lease = charge.lease
    tenant = lease.tenant
    unit = lease.unit
    try:
        key = receipt_service.generate_receipt(payment, charge, lease, tenant, unit)
        payment.receipt_pdf = key
    except Exception:
        # PDF failure is non-fatal; payment is still recorded
        pass

    await db.commit()
    await db.refresh(payment)
    return payment
