import uuid
from sqlalchemy import Column, String, Enum, DateTime, Date, Numeric, func, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class DriverStatus(str, enum.Enum):
    AVAILABLE = "available"
    ON_TRIP = "on_trip"
    INACTIVE = "inactive"


class LicenseClass(str, enum.Enum):
    LMV = "LMV"           # Light Motor Vehicle
    HMV = "HMV"           # Heavy Motor Vehicle
    HGMV = "HGMV"         # Heavy Goods Motor Vehicle
    HPMV = "HPMV"         # Heavy Passenger Motor Vehicle
    OTHER = "other"


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Personal details
    name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False, unique=True, index=True)
    alternate_phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)

    # License
    license_number = Column(String(50), nullable=True, unique=True, index=True)
    license_class = Column(Enum(LicenseClass), nullable=True, default=LicenseClass.HGMV)
    license_expiry = Column(Date, nullable=True)

    # Extended DL / personal details (auto-filled via Parivahan DL lookup)
    dob = Column(Date, nullable=True)
    blood_group = Column(String(10), nullable=True)
    father_name = Column(String(150), nullable=True)
    transport_validity = Column(Date, nullable=True)   # HMV/HGMV endorsement expiry
    issuing_rto = Column(String(100), nullable=True)
    badge_issue_date = Column(Date, nullable=True)

    # Status
    status = Column(Enum(DriverStatus), nullable=False, default=DriverStatus.AVAILABLE)

    # Future multi-tenant hook
    owner_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Driver {self.name} - {self.phone}>"
