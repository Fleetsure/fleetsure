from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class MiscExpenseCreate(BaseModel):
    vehicle_id:  Optional[UUID] = None
    trip_id:     Optional[UUID] = None
    date:        date
    amount:      Decimal
    category:    str = "other"
    description: Optional[str] = None
    notes:       Optional[str] = None


class MiscExpenseResponse(BaseModel):
    id:          UUID
    vehicle_id:  Optional[UUID] = None
    trip_id:     Optional[UUID] = None
    date:        date
    amount:      Decimal
    category:    str
    description: Optional[str] = None
    notes:       Optional[str] = None
    created_at:  datetime

    model_config = {"from_attributes": True}
