import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ExpenseType(str, enum.Enum):
    FUEL = "fuel"                          # Diesel / HSD
    TOLL = "toll"                          # Bridge / highway toll
    RTO = "rto"                            # RTO checkpost
    POLICE_CHALLAN = "police_challan"      # Police / Naka
    MAINTENANCE = "maintenance"            # Parts & repairs
    TYRE = "tyre"                          # Tyre repair / replacement
    OIL = "oil"                            # Engine oil / lubricants
    LOADING_UNLOADING = "loading_unloading"# Loading + unloading labour
    DRIVER_PAYMENT = "driver_payment"      # Driver salary / advance
    TELEPHONE = "telephone"                # Communication charges
    OTHER = "other"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to trip
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)

    # Expense details — stored as VARCHAR so new categories need no DB migration
    expense_type = Column(String(50), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(500), nullable=True)
    date = Column(Date, nullable=False)

    # Receipt reference (for future file upload feature)
    receipt_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    trip = relationship("Trip", back_populates="expenses")

    def __repr__(self):
        return f"<Expense {self.expense_type} ₹{self.amount}>"
