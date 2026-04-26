from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class PartyCreate(BaseModel):
    name:            str
    phone:           Optional[str] = None
    gstin:           Optional[str] = None
    address:         Optional[str] = None
    party_type:      str = "customer"
    opening_balance: Optional[Decimal] = 0
    notes:           Optional[str] = None


class PartyUpdate(BaseModel):
    name:            Optional[str] = None
    phone:           Optional[str] = None
    gstin:           Optional[str] = None
    address:         Optional[str] = None
    party_type:      Optional[str] = None
    opening_balance: Optional[Decimal] = None
    notes:           Optional[str] = None


class PartyResponse(BaseModel):
    id:              UUID
    name:            str
    phone:           Optional[str] = None
    gstin:           Optional[str] = None
    address:         Optional[str] = None
    party_type:      str
    opening_balance: Optional[Decimal] = None
    notes:           Optional[str] = None
    created_at:      datetime

    model_config = {"from_attributes": True}
