import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = {"schema": "pm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    id_document: Mapped[str | None] = mapped_column(String(500))  # R2 key — never expose to public
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    leases: Mapped[list["Lease"]] = relationship("Lease", back_populates="tenant")


from .lease import Lease  # noqa: E402
