import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class OwnerStatementCreate(BaseModel):
    period_start: date
    period_end: date
    mgmt_fee_pct: Decimal = Decimal("10")
    currency: str


class OwnerStatementOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    owner_id: uuid.UUID
    period_start: date
    period_end: date
    rent_collected: Decimal
    mgmt_fee: Decimal
    net_payout: Decimal
    currency: str
    pdf: str | None
    sent_at: datetime | None
    created_at: datetime
