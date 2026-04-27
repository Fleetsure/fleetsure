from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.toll_log import TollLog
from app.models.user import User
from app.schemas.toll_log import TollLogCreate, TollLogResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/tolls", tags=["Tolls"])


@router.post("/", response_model=TollLogResponse, status_code=201)
def add_toll(
    payload: TollLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = TollLog(**payload.model_dump(), owner_id=current_user.id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/", response_model=List[TollLogResponse])
def get_tolls(
    vehicle_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(TollLog).filter(TollLog.owner_id == current_user.id).order_by(TollLog.date.desc())
    if vehicle_id:
        q = q.filter(TollLog.vehicle_id == vehicle_id)
    return q.offset(skip).limit(limit).all()


@router.delete("/{log_id}", status_code=204)
def delete_toll(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(TollLog).filter(TollLog.id == log_id, TollLog.owner_id == current_user.id).first()
    if not log:
        raise HTTPException(404, "Toll log not found")
    db.delete(log)
    db.commit()
