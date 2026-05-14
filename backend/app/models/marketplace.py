import uuid
import enum
from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, Enum, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class LoadStatus(str, enum.Enum):
    OPEN      = "open"
    MATCHED   = "matched"
    EXPIRED   = "expired"
    CANCELLED = "cancelled"


class InterestStatus(str, enum.Enum):
    PENDING  = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ReturnLoad(Base):
    """A fleet owner posting their truck is returning empty and available for freight."""
    __tablename__ = "marketplace_return_loads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who posted it
    owner_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)

    # Route
    from_city = Column(String(150), nullable=False)   # truck will be available here
    to_city   = Column(String(150), nullable=False)   # preferred destination

    # Availability
    available_date = Column(Date, nullable=False)

    # Truck details
    vehicle_reg    = Column(String(30), nullable=True)   # denormalised for quick display
    capacity_tonnes = Column(Numeric(8, 2), nullable=True)
    cargo_accepted  = Column(String(200), nullable=True)  # e.g. "Any dry goods, no chemicals"

    # Price
    asking_price = Column(Numeric(12, 2), nullable=True)  # ₹ — optional, can negotiate

    # Contact (defaults to user's phone)
    contact_phone = Column(String(20), nullable=True)
    contact_name  = Column(String(150), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Status
    status = Column(Enum(LoadStatus), nullable=False, default=LoadStatus.OPEN, index=True)

    # Rating given after successful match (1-5)
    rating = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner     = relationship("User", foreign_keys=[owner_id])
    vehicle   = relationship("Vehicle", foreign_keys=[vehicle_id])
    interests = relationship("LoadInterest", back_populates="return_load", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ReturnLoad {self.from_city}→{self.to_city} [{self.status}]>"


class LoadInterest(Base):
    """Another fleet owner expressing interest in a posted return load."""
    __tablename__ = "marketplace_load_interests"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return_load_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_return_loads.id", ondelete="CASCADE"), nullable=False, index=True)
    interested_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    message = Column(Text, nullable=True)   # short note: cargo type, counter-offer, etc.
    status  = Column(Enum(InterestStatus), nullable=False, default=InterestStatus.PENDING)

    # Rating given by the interested party (after deal completes)
    rating = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    return_load     = relationship("ReturnLoad", back_populates="interests")
    interested_user = relationship("User", foreign_keys=[interested_user_id])

    def __repr__(self):
        return f"<LoadInterest load={self.return_load_id} status={self.status}>"
