from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal


class DriverPaymentCreate(BaseModel):
    driver_id: UUID
    date:      date
    type:      str     # advance / salary / deduction / bonus / settlement
    amount:    Decimal
    notes:     Optional[str] = None
    trip_id:   Optional[UUID] = None


class DriverPaymentResponse(BaseModel):
    id:        UUID
    driver_id: UUID
    date:      date
    type:      str
    amount:    Decimal
    notes:     Optional[str] = None
    trip_id:   Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DriverLedgerResponse(BaseModel):
    driver_id:       UUID
    driver_name:     str
    driver_phone:    str
    total_paid:      float   # advances + salary + bonus
    total_deducted:  float
    net_balance:     float   # positive = driver owes us, negative = we owe driver
    payments:        list[DriverPaymentResponse]
