import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, DateTime, Numeric, Integer, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum as py_enum
from ..core.database import Base


class LeaseStatus(str, py_enum.Enum):
    draft = "draft"
    active = "active"
    ended = "ended"
    terminated = "terminated"


class CurrencyEnum(str, py_enum.Enum):
    USD = "USD"
    EUR = "EUR"
    SRD = "SRD"


class Lease(Base):
    __tablename__ = "leases"
    __table_args__ = {"schema": "pm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pm.units.id"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pm.tenants.id"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    rent_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    rent_currency: Mapped[CurrencyEnum] = mapped_column(Enum(CurrencyEnum, schema="pm"), nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    billing_day: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[LeaseStatus] = mapped_column(
        Enum(LeaseStatus, schema="pm"), nullable=False, default=LeaseStatus.draft
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    unit: Mapped["Unit"] = relationship("Unit", back_populates="leases")
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="leases")
    charges: Mapped[list["RentCharge"]] = relationship("RentCharge", back_populates="lease")


from .unit import Unit  # noqa: E402
from .tenant import Tenant  # noqa: E402
from .rent_charge import RentCharge  # noqa: E402
