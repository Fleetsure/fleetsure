from pydantic import BaseModel, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from app.models.trip import TripStatus
from app.schemas.expense import ExpenseResponse
from app.schemas.vehicle import VehicleResponse


class TripCreate(BaseModel):
    vehicle_id: UUID
    driver_name: str
    driver_phone: Optional[str] = None
    origin: str
    destination: str
    distance_km: Optional[Decimal] = None
    start_date: date
    end_date: Optional[date] = None
    freight_amount: Decimal
    driver_advance: Optional[Decimal] = Decimal("0")
    doc_number: Optional[str] = None
    material: Optional[str] = None
    weight_tonnes: Optional[Decimal] = None
    notes: Optional[str] = None

    @field_validator("freight_amount")
    @classmethod
    def validate_freight(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Freight amount cannot be negative")
        return round(v, 2)

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: Optional[date], info) -> Optional[date]:
        # info.data contains already-validated fields
        start = info.data.get("start_date")
        if v and start and v < start:
            raise ValueError("end_date cannot be before start_date")
        return v


class TripUpdate(BaseModel):
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    distance_km: Optional[Decimal] = None
    end_date: Optional[date] = None
    freight_amount: Optional[Decimal] = None
    driver_advance: Optional[Decimal] = None
    doc_number: Optional[str] = None
    material: Optional[str] = None
    weight_tonnes: Optional[Decimal] = None
    status: Optional[TripStatus] = None
    notes: Optional[str] = None


class TripResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    driver_name: str
    driver_phone: Optional[str]
    origin: str
    destination: str
    distance_km: Optional[Decimal]
    start_date: date
    end_date: Optional[date]
    freight_amount: Decimal
    driver_advance: Optional[Decimal] = Decimal("0")
    doc_number: Optional[str] = None
    material: Optional[str] = None
    weight_tonnes: Optional[Decimal] = None
    status: TripStatus
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TripDetailResponse(TripResponse):
    """Full trip detail: includes vehicle info + all expenses."""
    vehicle: VehicleResponse
    expenses: List[ExpenseResponse] = []

    model_config = {"from_attributes": True}
