import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....models.payment import Payment
from ....schemas.payment import PaymentCreate, PaymentOut
from ....services.payment_service import record_payment

router = APIRouter(prefix="/charges/{charge_id}/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
async def list_payments(
    charge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    result = await db.execute(select(Payment).where(Payment.charge_id == charge_id))
    return result.scalars().all()


@router.post("", response_model=PaymentOut, status_code=201)
async def create_payment(
    charge_id: uuid.UUID,
    body: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    try:
        payment = await record_payment(charge_id, body, user.id, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return payment
