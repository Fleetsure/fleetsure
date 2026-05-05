import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id   = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    phone      = Column(String(20), nullable=True)   # WhatsApp number with country code e.g. 919876543210

    # Email preferences
    email_compliance_alerts  = Column(Boolean, default=True, nullable=False)
    email_monthly_summary    = Column(Boolean, default=True, nullable=False)

    # WhatsApp preferences
    whatsapp_compliance_alerts = Column(Boolean, default=False, nullable=False)
    whatsapp_monthly_summary   = Column(Boolean, default=False, nullable=False)

    # Alert thresholds (days before expiry to alert)
    alert_days_before = Column(String(20), default="30,15,7", nullable=False)  # comma-separated

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<NotificationSettings owner={self.owner_id}>"
