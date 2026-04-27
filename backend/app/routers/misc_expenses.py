from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.misc_expense import MiscExpense
from app.models.user import User
from app.schemas.misc_expense import MiscExpenseCreate, MiscExpenseResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/misc-expenses", tags=["Misc Expenses"])


@router.post("/", response_model=MiscExpenseResponse, status_code=201)
def add_misc_expense(
    payload: MiscExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exp = MiscExpense(**payload.model_dump(), owner_id=current_user.id)
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@router.get("/", response_model=List[MiscExpenseResponse])
def get_misc_expenses(
    vehicle_id: Optional[UUID] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(MiscExpense).filter(MiscExpense.owner_id == current_user.id).order_by(MiscExpense.date.desc())
    if vehicle_id:
        q = q.filter(MiscExpense.vehicle_id == vehicle_id)
    if category:
        q = q.filter(MiscExpense.category == category)
    return q.offset(skip).limit(limit).all()


@router.delete("/{exp_id}", status_code=204)
def delete_misc_expense(
    exp_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exp = db.query(MiscExpense).filter(MiscExpense.id == exp_id, MiscExpense.owner_id == current_user.id).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    db.delete(exp)
    db.commit()
