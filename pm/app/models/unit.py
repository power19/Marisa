import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = {"schema": "pm"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pm.owners.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    owner: Mapped["Owner"] = relationship("Owner", back_populates="units")
    leases: Mapped[list["Lease"]] = relationship("Lease", back_populates="unit")
    maintenance_tickets: Mapped[list["MaintenanceTicket"]] = relationship("MaintenanceTicket", back_populates="unit")


from .owner import Owner  # noqa: E402
from .lease import Lease  # noqa: E402
from .maintenance_ticket import MaintenanceTicket  # noqa: E402
