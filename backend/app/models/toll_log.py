import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class TollLog(Base):
    __tablename__ = "toll_logs"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id   = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    trip_id      = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    date         = Column(Date, nullable=False)
    amount       = Column(Numeric(10, 2), nullable=False)
    toll_plaza   = Column(String(200), nullable=True)
    route        = Column(String(200), nullable=True)
    payment_mode = Column(String(20), nullable=False, default="cash")  # fastag | cash
    notes        = Column(Text, nullable=True)
    owner_id     = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vehicle = relationship("Vehicle", lazy="select")

    def __repr__(self):
        return f"<TollLog vehicle={self.vehicle_id} {self.date} ₹{self.amount}>"
