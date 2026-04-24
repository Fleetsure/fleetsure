import uuid
from sqlalchemy import Column, String, Integer, Enum, DateTime, Date, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class VehicleStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    IN_TRIP = "in_trip"
    MAINTENANCE = "maintenance"


class VehicleType(str, enum.Enum):
    TRUCK = "truck"
    MINI_TRUCK = "mini_truck"
    TRAILER = "trailer"
    TANKER = "tanker"
    CONTAINER = "container"
    OTHER = "other"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core identification
    registration_number = Column(String(20), unique=True, nullable=False, index=True)
    make = Column(String(100), nullable=False)           # e.g., Tata, Ashok Leyland
    model = Column(String(100), nullable=False)          # e.g., LPT 2518, Ecomet
    year = Column(Integer, nullable=True)
    vehicle_type = Column(Enum(VehicleType), nullable=False, default=VehicleType.TRUCK)

    # Extended details (auto-populated via Vahan or manually entered)
    fuel_type = Column(String(50), nullable=True)         # Diesel, Petrol, CNG, Electric
    chassis_number = Column(String(100), nullable=True)
    engine_number = Column(String(100), nullable=True)
    vehicle_class = Column(String(100), nullable=True)    # M-Goods Carrying, LMV-TR, etc.
    owner_name = Column(String(200), nullable=True)       # Registered owner at RTO
    rto_code = Column(String(20), nullable=True)          # MH12, DL01C, etc.
    color = Column(String(50), nullable=True)

    # Compliance dates — critical for Indian fleet ops
    insurance_expiry = Column(Date, nullable=True)
    fitness_expiry = Column(Date, nullable=True)          # Fitness Certificate
    puc_expiry = Column(Date, nullable=True)              # Pollution Under Control
    permit_expiry = Column(Date, nullable=True)           # National/State Permit

    # Status
    status = Column(Enum(VehicleStatus), nullable=False, default=VehicleStatus.ACTIVE)

    # Multi-tenant: FK to users table
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    trips = relationship("Trip", back_populates="vehicle", lazy="select")
    owner = relationship("User", back_populates="vehicles")

    def __repr__(self):
        return f"<Vehicle {self.registration_number} - {self.make} {self.model}>"
