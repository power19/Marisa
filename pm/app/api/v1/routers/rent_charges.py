import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....models.rent_charge import RentCharge, ChargeStatus
from ....schemas.rent_charge import RentChargeOut
from ....services.charge_service import refresh_charge_status

router = APIRouter(prefix="/charges", tags=["charges"])


@router.get("", response_model=list[RentChargeOut])
async def list_charges(
    lease_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    q = select(RentCharge)
    if lease_id:
        q = q.where(RentCharge.lease_id == lease_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{charge_id}", response_model=RentChargeOut)
async def get_charge(
    charge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    result = await db.execute(select(RentCharge).where(RentCharge.id == charge_id))
    charge = result.scalar_one_or_none()
    if charge is None:
        raise HTTPException(status_code=404, detail="Charge not found")
    return charge


@router.post("/{charge_id}/waive", response_model=RentChargeOut)
async def waive_charge(
    charge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_admin()
    result = await db.execute(select(RentCharge).where(RentCharge.id == charge_id))
    charge = result.scalar_one_or_none()
    if charge is None:
        raise HTTPException(status_code=404, detail="Charge not found")
    charge.status = ChargeStatus.waived
    await db.commit()
    await db.refresh(charge)
    return charge
