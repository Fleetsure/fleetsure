from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class FuelLogCreate(BaseModel):
    vehicle_id:   UUID
    date:         date
    odometer_km:  Decimal
    litres:       Decimal
    amount:       Decimal
    fuel_station: Optional[str] = None
    notes:        Optional[str] = None


class FuelLogResponse(BaseModel):
    id:           UUID
    vehicle_id:   UUID
    date:         date
    odometer_km:  Decimal
    litres:       Decimal
    amount:       Decimal
    fuel_station: Optional[str] = None
    notes:        Optional[str] = None
    created_at:   datetime

    model_config = {"from_attributes": True}


class FuelAnalytics(BaseModel):
    vehicle_id:         UUID
    registration_number: str
    avg_kmpl:           Optional[float]
    last_kmpl:          Optional[float]
    anomaly:            bool       # True if last fill is >20% below avg
    anomaly_pct:        Optional[float]
    total_litres:       float
    total_spend:        float
    fill_count:         int
