import uuid
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class Owner(Base):
    __tablename__ = "owners"
    __table_args__ = {"schema": "pm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    payout_notes: Mapped[str | None] = mapped_column(Text)

    units: Mapped[list["Unit"]] = relationship("Unit", back_populates="owner")
    statements: Mapped[list["OwnerStatement"]] = relationship("OwnerStatement", back_populates="owner")


from .unit import Unit  # noqa: E402
from .owner_statement import OwnerStatement  # noqa: E402
