import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    vehicle_id    = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    date          = Column(Date, nullable=False)
    odometer_km   = Column(Numeric(10, 2), nullable=False)   # reading at fill-up
    litres        = Column(Numeric(8, 2), nullable=False)
    amount        = Column(Numeric(10, 2), nullable=False)   # total ₹ paid
    fuel_station  = Column(String(200), nullable=True)
    notes         = Column(Text, nullable=True)

    owner_id      = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vehicle       = relationship("Vehicle", lazy="select")

    def __repr__(self):
        return f"<FuelLog vehicle={self.vehicle_id} {self.date} {self.litres}L>"
