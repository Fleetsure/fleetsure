from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.schemas.driver import DriverCreate, DriverUpdate, DriverResponse
from app.services.driver_service import DriverService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.post("/", response_model=DriverResponse, status_code=201)
def create_driver(
    payload: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DriverService.create(db, payload, owner_id=current_user.id)


@router.get("/", response_model=List[DriverResponse])
def get_drivers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DriverService.get_all(db, owner_id=current_user.id, skip=skip, limit=limit)


@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DriverService.get_by_id(db, driver_id, owner_id=current_user.id)


@router.patch("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: UUID,
    payload: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DriverService.update(db, driver_id, payload, owner_id=current_user.id)
