from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.tyre_log import TyreLog
from app.models.user import User
from app.schemas.tyre_log import TyreLogCreate, TyreLogResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/tyres", tags=["Tyres"])


@router.post("/", response_model=TyreLogResponse, status_code=201)
def add_tyre_log(
    payload: TyreLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = TyreLog(**payload.model_dump(), owner_id=current_user.id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/", response_model=List[TyreLogResponse])
def get_tyre_logs(
    vehicle_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TyreLog).filter(TyreLog.owner_id == current_user.id).order_by(TyreLog.date.desc())
    if vehicle_id:
        q = q.filter(TyreLog.vehicle_id == vehicle_id)
    return q.offset(skip).limit(limit).all()


@router.delete("/{log_id}", status_code=204)
def delete_tyre_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(TyreLog).filter(TyreLog.id == log_id, TyreLog.owner_id == current_user.id).first()
    if not log:
        raise HTTPException(404, "Tyre log not found")
    db.delete(log)
    db.commit()
