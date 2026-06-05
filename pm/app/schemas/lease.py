import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator
from ..models.lease import LeaseStatus, CurrencyEnum


class LeaseCreate(BaseModel):
    unit_id: uuid.UUID
    tenant_id: uuid.UUID
    start_date: date
    end_date: date
    rent_amount: Decimal
    rent_currency: CurrencyEnum
    deposit_amount: Decimal = Decimal("0")
    billing_day: int

    @field_validator("billing_day")
    @classmethod
    def billing_day_range(cls, v: int) -> int:
        if not 1 <= v <= 28:
            raise ValueError("billing_day must be between 1 and 28")
        return v

    @field_validator("rent_amount", "deposit_amount")
    @classmethod
    def positive_amount(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Amount must be non-negative")
        return v


class LeaseOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    unit_id: uuid.UUID
    tenant_id: uuid.UUID
    start_date: date
    end_date: date
    rent_amount: Decimal
    rent_currency: CurrencyEnum
    deposit_amount: Decimal
    billing_day: int
    status: LeaseStatus
    created_at: datetime
