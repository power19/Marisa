"""M5 portal tests: tenant maintenance ticket isolation and submission."""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_submit_ticket_rejected_for_wrong_unit():
    """Tenant cannot submit a ticket for a unit they don't lease."""
    from fastapi import HTTPException
    from app.api.v1.routers.portal import submit_ticket
    from app.core.auth import CurrentUser
    from app.schemas.maintenance_ticket import MaintenanceTicketCreate

    user = CurrentUser(id=str(uuid.uuid4()), role="tenant")
    body = MaintenanceTicketCreate(unit_id=uuid.uuid4(), title="Leaking tap")

    tenant = MagicMock()
    tenant.id = uuid.uuid4()
    tenant.name = "Test Tenant"

    db = AsyncMock()
    # First call: _get_tenant → returns tenant
    # Second call: _tenant_unit_ids → returns empty set (different unit)
    tenant_result = MagicMock()
    tenant_result.scalar_one_or_none = MagicMock(return_value=tenant)
    unit_ids_result = MagicMock()
    unit_ids_result.all = MagicMock(return_value=[])  # no rows

    call_count = 0
    async def mock_execute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return tenant_result
        return unit_ids_result

    db.execute = mock_execute

    with pytest.raises(HTTPException) as exc_info:
        await submit_ticket(body, db, user)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_submit_ticket_allowed_for_own_unit():
    """Tenant can submit a ticket for a unit they lease."""
    from app.api.v1.routers.portal import submit_ticket
    from app.core.auth import CurrentUser
    from app.schemas.maintenance_ticket import MaintenanceTicketCreate

    user = CurrentUser(id=str(uuid.uuid4()), role="tenant")
    unit_id = uuid.uuid4()
    body = MaintenanceTicketCreate(unit_id=unit_id, title="Broken AC")

    tenant = MagicMock()
    tenant.id = uuid.uuid4()
    tenant.name = "Test Tenant"

    unit = MagicMock()
    unit.id = unit_id
    unit.label = "Unit 3B"

    ticket = MagicMock()
    ticket.id = uuid.uuid4()
    ticket.unit_id = unit_id
    ticket.title = "Broken AC"
    ticket.status = "open"
    ticket.photos = None
    ticket.assignee = None
    ticket.reported_by = user.id
    ticket.description = None
    ticket.created_at = None
    ticket.resolved_at = None

    db = AsyncMock()
    tenant_result = MagicMock()
    tenant_result.scalar_one_or_none = MagicMock(return_value=tenant)
    unit_ids_result = MagicMock()
    unit_ids_result.all = MagicMock(return_value=[(unit_id,)])
    unit_result = MagicMock()
    unit_result.scalar_one_or_none = MagicMock(return_value=unit)

    call_count = 0
    async def mock_execute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return tenant_result
        elif call_count == 2:
            return unit_ids_result
        return unit_result

    db.execute = mock_execute
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock(side_effect=lambda t: None)

    with patch("app.services.email_service.notify_ticket_created"):
        # patch MaintenanceTicket constructor result
        with patch("app.api.v1.routers.portal.MaintenanceTicket", return_value=ticket):
            result = await submit_ticket(body, db, user)

    assert result.unit_id == unit_id


@pytest.mark.asyncio
async def test_my_tickets_returns_only_own_units():
    """my_tickets only returns tickets for units the tenant leases."""
    from app.api.v1.routers.portal import my_tickets
    from app.core.auth import CurrentUser

    user = CurrentUser(id=str(uuid.uuid4()), role="tenant")
    unit_id = uuid.uuid4()

    tenant = MagicMock()
    tenant.id = uuid.uuid4()

    ticket = MagicMock()
    ticket.unit_id = unit_id

    db = AsyncMock()
    tenant_result = MagicMock()
    tenant_result.scalar_one_or_none = MagicMock(return_value=tenant)
    unit_ids_result = MagicMock()
    unit_ids_result.all = MagicMock(return_value=[(unit_id,)])
    tickets_result = MagicMock()
    tickets_result.scalars.return_value.all = MagicMock(return_value=[ticket])

    call_count = 0
    async def mock_execute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return tenant_result
        elif call_count == 2:
            return unit_ids_result
        return tickets_result

    db.execute = mock_execute

    result = await my_tickets(db, user)
    assert len(result) == 1
    assert result[0].unit_id == unit_id


@pytest.mark.asyncio
async def test_my_tickets_empty_when_no_leases():
    """my_tickets returns [] when tenant has no leases."""
    from app.api.v1.routers.portal import my_tickets
    from app.core.auth import CurrentUser

    user = CurrentUser(id=str(uuid.uuid4()), role="tenant")
    tenant = MagicMock()
    tenant.id = uuid.uuid4()

    db = AsyncMock()
    tenant_result = MagicMock()
    tenant_result.scalar_one_or_none = MagicMock(return_value=tenant)
    unit_ids_result = MagicMock()
    unit_ids_result.all = MagicMock(return_value=[])

    call_count = 0
    async def mock_execute(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return tenant_result
        return unit_ids_result

    db.execute = mock_execute

    result = await my_tickets(db, user)
    assert result == []
