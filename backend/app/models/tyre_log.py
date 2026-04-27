import uuid
from sqlalchemy import Column, String, Numeric, Integer, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class TyreLog(Base):
    __tablename__ = "tyre_logs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id    = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    date          = Column(Date, nullable=False)
    amount        = Column(Numeric(10, 2), nullable=False)
    tyre_brand    = Column(String(100), nullable=True)   # MRF, Apollo, Bridgestone...
    tyre_count    = Column(Integer, nullable=False, default=1)
    tyre_type     = Column(String(30), nullable=False, default="new")  # new | recap | repair | balance | alignment
    tyre_position = Column(String(100), nullable=True)   # Front Left, Rear Right, All...
    odometer_km   = Column(Numeric(10, 2), nullable=True)
    notes         = Column(Text, nullable=True)
    owner_id      = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vehicle = relationship("Vehicle", lazy="select")

    def __repr__(self):
        return f"<TyreLog vehicle={self.vehicle_id} {self.date} {self.tyre_type}>"
