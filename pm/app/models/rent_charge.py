import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, DateTime, Numeric, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum as py_enum
from ..core.database import Base


class ChargeStatus(str, py_enum.Enum):
    due = "due"
    partial = "partial"
    paid = "paid"
    overdue = "overdue"
    waived = "waived"


class RentCharge(Base):
    __tablename__ = "rent_charges"
    __table_args__ = {"schema": "pm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lease_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pm.leases.id"), nullable=False)
    period: Mapped[date] = mapped_column(Date, nullable=False)  # first of month
    amount_due: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "EUR", "SRD", name="currency_enum", schema="pm"), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    status: Mapped[ChargeStatus] = mapped_column(
        Enum(ChargeStatus, schema="pm"), nullable=False, default=ChargeStatus.due
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lease: Mapped["Lease"] = relationship("Lease", back_populates="charges")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="charge")


from .lease import Lease  # noqa: E402
from .payment import Payment  # noqa: E402
