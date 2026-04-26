import uuid, enum
from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class PolicyType(str, enum.Enum):
    INSURANCE   = "insurance"
    FITNESS     = "fitness"
    PERMIT      = "permit"
    PUC         = "puc"
    ROAD_TAX    = "road_tax"
    OTHER       = "other"

class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id    = Column(UUID(as_uuid=True), nullable=False, index=True)
    policy_type   = Column(Enum(PolicyType), nullable=False, default=PolicyType.INSURANCE)
    policy_number = Column(String(100), nullable=True)
    insurer       = Column(String(200), nullable=True)
    start_date    = Column(Date, nullable=True)
    expiry_date   = Column(Date, nullable=False)
    premium       = Column(Numeric(12, 2), nullable=True)
    notes         = Column(Text, nullable=True)
    owner_id      = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
