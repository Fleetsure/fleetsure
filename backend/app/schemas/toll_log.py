from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class TollLogCreate(BaseModel):
    vehicle_id:   UUID
    trip_id:      Optional[UUID] = None
    date:         date
    amount:       Decimal
    toll_plaza:   Optional[str] = None
    route:        Optional[str] = None
    payment_mode: str = "cash"
    notes:        Optional[str] = None


class TollLogResponse(BaseModel):
    id:           UUID
    vehicle_id:   UUID
    trip_id:      Optional[UUID] = None
    date:         date
    amount:       Decimal
    toll_plaza:   Optional[str] = None
    route:        Optional[str] = None
    payment_mode: str
    notes:        Optional[str] = None
    created_at:   datetime

    model_config = {"from_attributes": True}
