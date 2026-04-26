import uuid
import enum
from sqlalchemy import Column, String, Numeric, DateTime, Text, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class PartyType(str, enum.Enum):
    CUSTOMER     = "customer"
    TRANSPORTER  = "transporter"
    VENDOR       = "vendor"


class Party(Base):
    __tablename__ = "parties"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(String(200), nullable=False)
    phone         = Column(String(20), nullable=True)
    gstin         = Column(String(20), nullable=True)
    address       = Column(Text, nullable=True)
    party_type    = Column(Enum(PartyType), nullable=False, default=PartyType.CUSTOMER)

    # Running balance — positive = they owe us, negative = we owe them
    opening_balance = Column(Numeric(14, 2), nullable=True, default=0)

    notes         = Column(Text, nullable=True)
    owner_id      = Column(UUID(as_uuid=True), nullable=True, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Party {self.name} [{self.party_type}]>"
