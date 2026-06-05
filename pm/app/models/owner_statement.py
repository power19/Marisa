import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, Numeric, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class OwnerStatement(Base):
    __tablename__ = "owner_statements"
    __table_args__ = {"schema": "pm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pm.owners.id"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    rent_collected: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    mgmt_fee: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    net_payout: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "EUR", "SRD", name="currency_enum", schema="pm"), nullable=False)
    pdf: Mapped[str | None] = mapped_column(String(500))  # R2 key
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["Owner"] = relationship("Owner", back_populates="statements")


from .owner import Owner  # noqa: E402
