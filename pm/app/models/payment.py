import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, DateTime, Numeric, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": "pm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    charge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pm.rent_charges.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "EUR", "SRD", name="currency_enum", schema="pm"), nullable=False)
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str] = mapped_column(Enum("cash", "bank", "other", name="payment_method_enum", schema="pm"), nullable=False)
    recorded_by: Mapped[str] = mapped_column(String(36), nullable=False)
    receipt_pdf: Mapped[str | None] = mapped_column(String(500))  # R2 key
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    charge: Mapped["RentCharge"] = relationship("RentCharge", back_populates="payments")


from .rent_charge import RentCharge  # noqa: E402
