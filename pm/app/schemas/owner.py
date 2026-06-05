import uuid
from pydantic import BaseModel, EmailStr


class OwnerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    payout_notes: str | None = None
    user_id: str | None = None


class OwnerUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    payout_notes: str | None = None


class OwnerOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    user_id: str | None
    name: str
    email: str
    phone: str | None
    payout_notes: str | None
