import uuid
from sqlalchemy import Column, String, Numeric, Date, Enum, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class TripStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Vehicle
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Driver — driver_id links to drivers table (optional for backwards compat)
    driver_id    = Column(UUID(as_uuid=True), nullable=True, index=True)
    driver_name  = Column(String(150), nullable=False)
    driver_phone = Column(String(20), nullable=True)

    # Route
    origin = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    distance_km = Column(Numeric(10, 2), nullable=True)

    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

    # Trip document
    doc_number = Column(String(100), nullable=True)       # LR No. / Consignment Note
    material   = Column(String(200), nullable=True)       # Goods being transported
    weight_tonnes = Column(Numeric(10, 2), nullable=True) # Weight in tonnes

    # Revenue — the freight amount the client pays for this trip
    freight_amount = Column(Numeric(12, 2), nullable=False, default=0)

    # Driver advance given at trip start (for reconciliation)
    driver_advance = Column(Numeric(12, 2), nullable=True, default=0)

    # Status
    status = Column(Enum(TripStatus), nullable=False, default=TripStatus.PLANNED)

    # Notes
    notes = Column(Text, nullable=True)

    # Future multi-tenant hook
    owner_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="trips")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan", lazy="select")

    def __repr__(self):
        return f"<Trip {self.origin} → {self.destination} [{self.status}]>"
