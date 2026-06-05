"""Tenant portal: view own lease, charges, payments."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....models.tenant import Tenant
from ....models.lease import Lease
from ....models.rent_charge import RentCharge
from ....models.payment import Payment
from ....schemas.lease import LeaseOut
from ....schemas.rent_charge import RentChargeOut
from ....schemas.payment import PaymentOut

router = APIRouter(prefix="/portal", tags=["portal"])


async def _get_tenant(user: CurrentUser, db: AsyncSession) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.user_id == user.id))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
    return tenant


@router.get("/lease", response_model=list[LeaseOut])
async def my_leases(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = await _get_tenant(user, db)
    result = await db.execute(select(Lease).where(Lease.tenant_id == tenant.id))
    return result.scalars().all()


@router.get("/charges", response_model=list[RentChargeOut])
async def my_charges(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = await _get_tenant(user, db)
    result = await db.execute(
        select(RentCharge)
        .join(Lease, Lease.id == RentCharge.lease_id)
        .where(Lease.tenant_id == tenant.id)
    )
    return result.scalars().all()


@router.get("/payments", response_model=list[PaymentOut])
async def my_payments(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = await _get_tenant(user, db)
    result = await db.execute(
        select(Payment)
        .join(RentCharge, RentCharge.id == Payment.charge_id)
        .join(Lease, Lease.id == RentCharge.lease_id)
        .where(Lease.tenant_id == tenant.id)
    )
    return result.scalars().all()
