from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class TyreLogCreate(BaseModel):
    vehicle_id:    UUID
    date:          date
    amount:        Decimal
    tyre_brand:    Optional[str] = None
    tyre_count:    int = 1
    tyre_type:     str = "new"
    tyre_position: Optional[str] = None
    odometer_km:   Optional[Decimal] = None
    notes:         Optional[str] = None


class TyreLogResponse(BaseModel):
    id:            UUID
    vehicle_id:    UUID
    date:          date
    amount:        Decimal
    tyre_brand:    Optional[str] = None
    tyre_count:    int
    tyre_type:     str
    tyre_position: Optional[str] = None
    odometer_km:   Optional[Decimal] = None
    notes:         Optional[str] = None
    created_at:    datetime

    model_config = {"from_attributes": True}
