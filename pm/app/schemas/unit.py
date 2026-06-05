import uuid
from pydantic import BaseModel


class UnitCreate(BaseModel):
    owner_id: uuid.UUID
    label: str
    address: str | None = None
    notes: str | None = None
    listing_id: str | None = None


class UnitUpdate(BaseModel):
    label: str | None = None
    address: str | None = None
    notes: str | None = None
    listing_id: str | None = None


class UnitOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    owner_id: uuid.UUID
    listing_id: str | None
    label: str
    address: str | None
    notes: str | None
