import uuid
import enum
from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class PaymentType(str, enum.Enum):
    ADVANCE     = "advance"
    SALARY      = "salary"
    DEDUCTION   = "deduction"
    BONUS       = "bonus"
    SETTLEMENT  = "settlement"


class DriverPayment(Base):
    __tablename__ = "driver_payments"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id   = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True)
    date        = Column(Date, nullable=False)
    type        = Column(Enum(PaymentType), nullable=False)
    amount      = Column(Numeric(12, 2), nullable=False)
    notes       = Column(Text, nullable=True)
    trip_id     = Column(UUID(as_uuid=True), nullable=True)   # soft ref, no FK

    owner_id    = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    driver      = relationship("Driver", lazy="select")

    def __repr__(self):
        return f"<DriverPayment {self.type} ₹{self.amount} driver={self.driver_id}>"
