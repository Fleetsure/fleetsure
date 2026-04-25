from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/trips/{trip_id}/expenses", tags=["Expenses"])


@router.post("/", response_model=ExpenseResponse, status_code=201)
def add_expense(trip_id: UUID, payload: ExpenseCreate, db: Session = Depends(get_db)):
    return ExpenseService.add_to_trip(db, trip_id, payload)


@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(trip_id: UUID, db: Session = Depends(get_db)):
    return ExpenseService.get_by_trip(db, trip_id)
