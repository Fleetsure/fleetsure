from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date, timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models.insurance import InsurancePolicy, PolicyType
from app.models.vehicle import Vehicle

router = APIRouter(prefix="/insurance", tags=["Insurance"])

class PolicyCreate(BaseModel):
    vehicle_id: UUID
    policy_type: PolicyType = PolicyType.INSURANCE
    policy_number: Optional[str] = None
    insurer: Optional[str] = None
    start_date: Optional[date] = None
    expiry_date: date
    premium: Optional[float] = None
    notes: Optional[str] = None

class PolicyResponse(BaseModel):
    id: str
    vehicle_id: str
    policy_type: str
    policy_number: Optional[str]
    insurer: Optional[str]
    start_date: Optional[date]
    expiry_date: date
    premium: Optional[float]
    notes: Optional[str]
    days_left: int
    status: str           # active / expiring_soon / expired
    reg_number: Optional[str] = None

    class Config:
        from_attributes = True

def enrich(p: InsurancePolicy, reg_map: dict) -> dict:
    today = date.today()
    days_left = (p.expiry_date - today).days
    if days_left < 0:
        status = "expired"
    elif days_left <= 30:
        status = "expiring_soon"
    else:
        status = "active"
    return {
        "id": str(p.id),
        "vehicle_id": str(p.vehicle_id),
        "policy_type": p.policy_type,
        "policy_number": p.policy_number,
        "insurer": p.insurer,
        "start_date": p.start_date,
        "expiry_date": p.expiry_date,
        "premium": float(p.premium) if p.premium else None,
        "notes": p.notes,
        "days_left": days_left,
        "status": status,
        "reg_number": reg_map.get(str(p.vehicle_id)),
    }

@router.post("/", status_code=201)
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db)):
    p = InsurancePolicy(**payload.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    vehicles = {str(v.id): v.reg_number for v in db.query(Vehicle).all()}
    return enrich(p, vehicles)

@router.get("/")
def list_policies(vehicle_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(InsurancePolicy).order_by(InsurancePolicy.expiry_date)
    if vehicle_id:
        q = q.filter(InsurancePolicy.vehicle_id == vehicle_id)
    policies = q.all()
    vehicles = {str(v.id): v.reg_number for v in db.query(Vehicle).all()}
    return [enrich(p, vehicles) for p in policies]

@router.delete("/{policy_id}", status_code=204)
def delete_policy(policy_id: UUID, db: Session = Depends(get_db)):
    p = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
    if not p:
        raise HTTPException(404, "Policy not found")
    db.delete(p); db.commit()
