import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class TenantCreate(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    phone: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


class TenantOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    user_id: str
    name: str
    email: str
    phone: str | None
    created_at: datetime
    # id_document intentionally omitted
