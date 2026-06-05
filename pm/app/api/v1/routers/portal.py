"""Tenant portal: view own lease, charges, payments, and maintenance tickets."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....core.config import settings
from ....models.tenant import Tenant
from ....models.lease import Lease
from ....models.rent_charge import RentCharge
from ....models.payment import Payment
from ....models.unit import Unit
from ....models.maintenance_ticket import MaintenanceTicket
from ....schemas.lease import LeaseOut
from ....schemas.rent_charge import RentChargeOut
from ....schemas.payment import PaymentOut
from ....schemas.maintenance_ticket import (
    MaintenanceTicketCreate,
    MaintenanceTicketOut,
)

router = APIRouter(prefix="/portal", tags=["portal"])


async def _get_tenant(user: CurrentUser, db: AsyncSession) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.user_id == user.id))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
    return tenant


async def _tenant_unit_ids(tenant: Tenant, db: AsyncSession) -> set[uuid.UUID]:
    """Return the set of unit IDs the tenant has a lease on."""
    result = await db.execute(select(Lease.unit_id).where(Lease.tenant_id == tenant.id))
    return {row[0] for row in result.all()}


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


@router.get("/tickets", response_model=list[MaintenanceTicketOut])
async def my_tickets(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """List all maintenance tickets for the tenant's units."""
    tenant = await _get_tenant(user, db)
    unit_ids = await _tenant_unit_ids(tenant, db)
    if not unit_ids:
        return []
    result = await db.execute(
        select(MaintenanceTicket).where(MaintenanceTicket.unit_id.in_(unit_ids))
    )
    return result.scalars().all()


@router.post("/tickets", response_model=MaintenanceTicketOut, status_code=201)
async def submit_ticket(
    body: MaintenanceTicketCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Submit a maintenance ticket for a unit the tenant occupies."""
    tenant = await _get_tenant(user, db)
    unit_ids = await _tenant_unit_ids(tenant, db)
    if body.unit_id not in unit_ids:
        raise HTTPException(status_code=403, detail="Unit does not belong to your lease")

    # Fetch unit label for notification
    unit_result = await db.execute(select(Unit).where(Unit.id == body.unit_id))
    unit = unit_result.scalar_one_or_none()
    unit_label = unit.label if unit else str(body.unit_id)

    ticket = MaintenanceTicket(**body.model_dump(), reported_by=user.id)
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # Notify central inbox
    from ....services import email_service
    email_service.notify_ticket_created(
        ticket_id=ticket.id,
        title=ticket.title,
        unit_label=unit_label,
        reported_by=tenant.name,
        central_inbox=settings.EMAIL_CENTRAL_INBOX,
    )
    return ticket


@router.post("/tickets/{ticket_id}/photos", response_model=MaintenanceTicketOut)
async def upload_ticket_photos(
    ticket_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Upload photos for a ticket; only the tenant who owns the ticket may do this."""
    tenant = await _get_tenant(user, db)
    unit_ids = await _tenant_unit_ids(tenant, db)

    result = await db.execute(select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.unit_id not in unit_ids:
        raise HTTPException(status_code=403, detail="Not your ticket")

    from ....services import r2_service
    keys = list(ticket.photos or [])
    for upload in files:
        content = await upload.read()
        ext = (upload.filename or "photo").rsplit(".", 1)[-1].lower()
        key = f"tickets/{ticket_id}/{uuid.uuid4()}.{ext}"
        r2_service.upload_bytes(key, content, content_type=upload.content_type or "image/jpeg")
        keys.append(key)

    ticket.photos = keys
    await db.commit()
    await db.refresh(ticket)
    return ticket
