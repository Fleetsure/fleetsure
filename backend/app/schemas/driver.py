from pydantic import BaseModel, field_validator
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from app.models.driver import DriverStatus, LicenseClass


class DriverCreate(BaseModel):
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    license_class: Optional[LicenseClass] = LicenseClass.HGMV
    license_expiry: Optional[date] = None
    # Extended DL fields
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    father_name: Optional[str] = None
    transport_validity: Optional[date] = None
    issuing_rto: Optional[str] = None
    badge_issue_date: Optional[date] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "").replace("-", "")
        if not v.lstrip("+").isdigit():
            raise ValueError("Phone number must contain only digits")
        return v


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    license_class: Optional[LicenseClass] = None
    license_expiry: Optional[date] = None
    status: Optional[DriverStatus] = None
    # Extended DL fields
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    father_name: Optional[str] = None
    transport_validity: Optional[date] = None
    issuing_rto: Optional[str] = None
    badge_issue_date: Optional[date] = None


class DriverResponse(BaseModel):
    id: UUID
    name: str
    phone: str
    alternate_phone: Optional[str]
    address: Optional[str]
    license_number: Optional[str]
    license_class: Optional[LicenseClass]
    license_expiry: Optional[date]
    status: DriverStatus
    # Extended DL fields
    dob: Optional[date] = None
    blood_group: Optional[str] = None
    father_name: Optional[str] = None
    transport_validity: Optional[date] = None
    issuing_rto: Optional[str] = None
    badge_issue_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
