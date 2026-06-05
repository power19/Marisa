import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.auth import get_current_user, CurrentUser
from ....models.maintenance_ticket import MaintenanceTicket, TicketStatus
from ....models.lease import Lease
from ....models.tenant import Tenant
from ....schemas.maintenance_ticket import (
    MaintenanceTicketCreate,
    MaintenanceTicketUpdate,
    MaintenanceTicketOut,
)
from datetime import datetime, timezone

router = APIRouter(prefix="/tickets", tags=["maintenance"])


@router.get("", response_model=list[MaintenanceTicketOut])
async def list_tickets(
    unit_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    q = select(MaintenanceTicket)
    if unit_id:
        q = q.where(MaintenanceTicket.unit_id == unit_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=MaintenanceTicketOut, status_code=201)
async def create_ticket(
    body: MaintenanceTicketCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Agents/admins can also create tickets on behalf of tenants."""
    user.require_agent()
    ticket = MaintenanceTicket(**body.model_dump(), reported_by=user.id)
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.patch("/{ticket_id}", response_model=MaintenanceTicketOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    body: MaintenanceTicketUpdate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    user.require_agent()
    result = await db.execute(select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(ticket, k, v)
    if body.status in (TicketStatus.resolved, TicketStatus.closed) and ticket.resolved_at is None:
        ticket.resolved_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(ticket)

    # Notify tenant if status changed
    if body.status is not None and body.status != old_status:
        tenant_email = await _find_tenant_email(ticket.unit_id, db)
        if tenant_email:
            from ....services import email_service
            email_service.notify_ticket_status_changed(
                tenant_email=tenant_email,
                ticket_id=ticket.id,
                title=ticket.title,
                new_status=ticket.status.value,
            )
    return ticket


async def _find_tenant_email(unit_id: uuid.UUID, db: AsyncSession) -> str | None:
    """Find the active tenant's email for a unit."""
    from ....models.lease import LeaseStatus
    result = await db.execute(
        select(Tenant.email)
        .join(Lease, Lease.tenant_id == Tenant.id)
        .where(Lease.unit_id == unit_id, Lease.status == LeaseStatus.active)
    )
    row = result.first()
    return row[0] if row else None
