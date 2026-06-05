import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel
from ..models.rent_charge import ChargeStatus


class RentChargeOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    lease_id: uuid.UUID
    period: date
    amount_due: Decimal
    currency: str
    due_date: date
    amount_paid: Decimal
    status: ChargeStatus
    created_at: datetime
