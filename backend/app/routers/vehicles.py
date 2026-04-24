from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.post("/", response_model=VehicleResponse, status_code=201)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    """
    Register a new vehicle in the fleet.

    - **registration_number**: Must be unique (e.g., MH12AB1234)
    - **make**: Brand (e.g., Tata, Ashok Leyland)
    - **model**: Model name (e.g., LPT 2518)
    - **vehicle_type**: truck | mini_truck | trailer | tanker | container | other
    """
    return VehicleService.create(db, payload)


@router.get("/", response_model=List[VehicleResponse])
def get_vehicles(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: Session = Depends(get_db),
):
    """List all vehicles with pagination."""
    return VehicleService.get_all(db, skip=skip, limit=limit)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: UUID, db: Session = Depends(get_db)):
    """Get a single vehicle by ID."""
    return VehicleService.get_by_id(db, vehicle_id)


@router.patch("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: UUID, payload: VehicleUpdate, db: Session = Depends(get_db)):
    """
    Update vehicle fields (partial update — only send what you want to change).
    Use this to change status to maintenance, inactive, etc.
    """
    return VehicleService.update(db, vehicle_id, payload)
