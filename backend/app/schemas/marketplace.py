from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# ── Return Load ────────────────────────────────────────────────────────────────

class ReturnLoadCreate(BaseModel):
    from_city:       str
    to_city:         str
    available_date:  date
    vehicle_id:      Optional[UUID]   = None
    vehicle_reg:     Optional[str]    = None
    capacity_tonnes: Optional[Decimal] = None
    cargo_accepted:  Optional[str]    = None
    asking_price:    Optional[Decimal] = None
    contact_phone:   Optional[str]    = None
    contact_name:    Optional[str]    = None
    notes:           Optional[str]    = None


class ReturnLoadUpdate(BaseModel):
    from_city:       Optional[str]    = None
    to_city:         Optional[str]    = None
    available_date:  Optional[date]   = None
    capacity_tonnes: Optional[Decimal] = None
    cargo_accepted:  Optional[str]    = None
    asking_price:    Optional[Decimal] = None
    contact_phone:   Optional[str]    = None
    notes:           Optional[str]    = None
    status:          Optional[str]    = None


class ReturnLoadResponse(BaseModel):
    id:              UUID
    owner_id:        UUID
    vehicle_id:      Optional[UUID]
    from_city:       str
    to_city:         str
    available_date:  date
    vehicle_reg:     Optional[str]
    capacity_tonnes: Optional[Decimal]
    cargo_accepted:  Optional[str]
    asking_price:    Optional[Decimal]
    contact_phone:   Optional[str]
    contact_name:    Optional[str]
    notes:           Optional[str]
    status:          str
    rating:          Optional[int]
    created_at:      datetime
    # Enriched fields added by router
    owner_name:      Optional[str]    = None
    owner_trips:     Optional[int]    = None   # total completed trips — trust signal
    interest_count:  Optional[int]    = None
    my_interest_id:  Optional[UUID]   = None   # set when current user already expressed interest

    model_config = {"from_attributes": True}


# ── Load Interest ──────────────────────────────────────────────────────────────

class InterestCreate(BaseModel):
    message: Optional[str] = Field(None, max_length=500)


class InterestUpdate(BaseModel):
    status:  Optional[str] = None   # accepted | rejected | withdrawn
    rating:  Optional[int] = Field(None, ge=1, le=5)


class InterestResponse(BaseModel):
    id:                  UUID
    return_load_id:      UUID
    interested_user_id:  UUID
    message:             Optional[str]
    status:              str
    rating:              Optional[int]
    created_at:          datetime
    # Enriched
    interested_user_name:  Optional[str] = None
    interested_user_phone: Optional[str] = None
    # Load summary (for "sent interests" view)
    load_from_city:      Optional[str] = None
    load_to_city:        Optional[str] = None
    load_date:           Optional[date] = None
    load_owner_name:     Optional[str] = None
    load_owner_phone:    Optional[str] = None

    model_config = {"from_attributes": True}
