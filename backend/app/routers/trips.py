from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, TripDetailResponse
from app.schemas.profit import ProfitResponse
from app.services.trip_service import TripService
from app.services.expense_service import ExpenseService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.post("/", response_model=TripResponse, status_code=201)
def create_trip(
    payload: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService.create(db, payload)


@router.get("/", response_model=List[TripResponse])
def get_trips(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService.get_all(db, skip=skip, limit=limit)


@router.get("/{trip_id}", response_model=TripDetailResponse)
def get_trip_detail(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService.get_by_id(db, trip_id)


@router.patch("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: UUID,
    payload: TripUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripService.update(db, trip_id, payload)


@router.get("/{trip_id}/profit", response_model=ProfitResponse)
def get_trip_profit(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExpenseService.calculate_profit(db, trip_id)
