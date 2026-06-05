import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class PaymentCreate(BaseModel):
    amount: Decimal
    currency: str
    paid_on: date
    method: str  # cash | bank | other


class PaymentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    charge_id: uuid.UUID
    amount: Decimal
    currency: str
    paid_on: date
    method: str
    recorded_by: str
    receipt_pdf: str | None
    created_at: datetime
