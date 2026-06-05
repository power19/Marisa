import uuid
from datetime import datetime
from pydantic import BaseModel
from ..models.maintenance_ticket import TicketStatus


class MaintenanceTicketCreate(BaseModel):
    unit_id: uuid.UUID
    title: str
    description: str | None = None


class MaintenanceTicketUpdate(BaseModel):
    status: TicketStatus | None = None
    assignee: str | None = None


class MaintenanceTicketOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    unit_id: uuid.UUID
    reported_by: str
    title: str
    description: str | None
    status: TicketStatus
    photos: list[str] | None
    assignee: str | None
    created_at: datetime
    resolved_at: datetime | None
