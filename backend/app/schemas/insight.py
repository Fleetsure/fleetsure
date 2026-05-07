from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.insight import InsightSeverity, InsightType


class InsightResponse(BaseModel):
    id: UUID
    owner_id: UUID
    insight_type: InsightType
    severity: InsightSeverity
    title: str
    body: Optional[str]
    meta: Optional[Dict[str, Any]]
    vehicle_id: Optional[UUID]
    driver_id: Optional[UUID]
    trip_id: Optional[UUID]
    is_read: bool
    is_dismissed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class InsightsSummary(BaseModel):
    total: int
    unread: int
    insights: list[InsightResponse]


class RefreshResult(BaseModel):
    idle_vehicle_insights: int
    unrecorded_expense_insights: int
    cost_per_km_insights: int
    total: int
