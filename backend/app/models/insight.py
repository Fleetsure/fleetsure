import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class InsightType(str, enum.Enum):
    IDLE_VEHICLE       = "idle_vehicle"
    UNRECORDED_EXPENSE = "unrecorded_expense"
    COST_PER_KM        = "cost_per_km"
    FUEL_ANOMALY       = "fuel_anomaly"       # Phase 2
    DRIVER_FATIGUE     = "driver_fatigue"     # Phase 2
    MAINTENANCE_DUE    = "maintenance_due"    # Phase 2
    EMPTY_RUN          = "empty_run"          # Phase 2
    COMPLIANCE_EXPIRY  = "compliance_expiry"  # Phase 4


class InsightSeverity(str, enum.Enum):
    INFO     = "info"
    WARNING  = "warning"
    CRITICAL = "critical"


class OperationalInsight(Base):
    __tablename__ = "operational_insights"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id     = Column(UUID(as_uuid=True), nullable=False, index=True)

    insight_type = Column(Enum(InsightType), nullable=False, index=True)
    severity     = Column(Enum(InsightSeverity), nullable=False, default=InsightSeverity.INFO)

    title        = Column(String(300), nullable=False)
    body         = Column(Text, nullable=True)
    meta         = Column(JSONB, nullable=True)   # flexible per insight type

    # Optional links
    vehicle_id   = Column(UUID(as_uuid=True), nullable=True, index=True)
    driver_id    = Column(UUID(as_uuid=True), nullable=True, index=True)
    trip_id      = Column(UUID(as_uuid=True), nullable=True, index=True)

    is_read      = Column(Boolean, default=False, nullable=False)
    is_dismissed = Column(Boolean, default=False, nullable=False)

    created_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at   = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<Insight {self.insight_type} [{self.severity}] {self.title[:40]}>"
