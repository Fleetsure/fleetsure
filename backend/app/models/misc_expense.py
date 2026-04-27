import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class MiscExpense(Base):
    __tablename__ = "misc_expenses"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    trip_id    = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    date       = Column(Date, nullable=False)
    amount     = Column(Numeric(10, 2), nullable=False)
    category   = Column(String(50), nullable=False, default="other")
    # fine | parking | halting | loading_unloading | cleaning | battery | weighbridge | other
    description = Column(String(300), nullable=True)
    notes       = Column(Text, nullable=True)
    owner_id    = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vehicle = relationship("Vehicle", lazy="select")

    def __repr__(self):
        return f"<MiscExpense {self.category} ₹{self.amount} {self.date}>"
