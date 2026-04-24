from pydantic import BaseModel, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from app.models.vehicle import VehicleStatus, VehicleType


class VehicleCreate(BaseModel):
    registration_number: str
    make: str
    model: str
    year: Optional[int] = None
    vehicle_type: VehicleType = VehicleType.TRUCK

    # Extended fields (optional — filled via Vahan fetch or manual entry)
    fuel_type: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    vehicle_class: Optional[str] = None
    owner_name: Optional[str] = None
    rto_code: Optional[str] = None
    color: Optional[str] = None

    # Compliance dates
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None

    @field_validator("registration_number")
    @classmethod
    def normalize_registration(cls, v: str) -> str:
        return v.strip().upper().replace(" ", "")

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1980 or v > 2030):
            raise ValueError("Year must be between 1980 and 2030")
        return v


class VehicleUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[VehicleType] = None
    status: Optional[VehicleStatus] = None
    fuel_type: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    vehicle_class: Optional[str] = None
    owner_name: Optional[str] = None
    rto_code: Optional[str] = None
    color: Optional[str] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None


class VehicleResponse(BaseModel):
    id: UUID
    registration_number: str
    make: str
    model: str
    year: Optional[int]
    vehicle_type: VehicleType
    status: VehicleStatus

    # Extended
    fuel_type: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    vehicle_class: Optional[str] = None
    owner_name: Optional[str] = None
    rto_code: Optional[str] = None
    color: Optional[str] = None

    # Compliance dates
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    puc_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
