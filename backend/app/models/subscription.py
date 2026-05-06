import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id                 = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    plan                    = Column(String(50),  nullable=False, default="trial")   # trial/starter/growth/pro
    status                  = Column(String(50),  nullable=False, default="trial")   # trial/active/cancelled/past_due
    razorpay_subscription_id = Column(String(100), nullable=True, unique=True)
    trial_ends_at           = Column(DateTime(timezone=True), nullable=True)
    current_period_end      = Column(DateTime(timezone=True), nullable=True)
    created_at              = Column(DateTime(timezone=True), server_default=func.now())
    updated_at              = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Subscription user={self.user_id} plan={self.plan} status={self.status}>"
