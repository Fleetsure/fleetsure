from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models.fuel_log import FuelLog
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.fuel_log import FuelLogCreate, FuelLogResponse, FuelAnalytics
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/fuel", tags=["Fuel"])


@router.post("/", response_model=FuelLogResponse, status_code=201)
def add_fuel_log(
    payload: FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = FuelLog(**payload.model_dump(), owner_id=current_user.id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/", response_model=List[FuelLogResponse])
def get_fuel_logs(
    vehicle_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(FuelLog).filter(FuelLog.owner_id == current_user.id).order_by(FuelLog.date.desc())
    if vehicle_id:
        q = q.filter(FuelLog.vehicle_id == vehicle_id)
    return q.offset(skip).limit(limit).all()


@router.delete("/{log_id}", status_code=204)
def delete_fuel_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(FuelLog).filter(FuelLog.id == log_id, FuelLog.owner_id == current_user.id).first()
    if not log:
        raise HTTPException(404, "Log not found")
    db.delete(log)
    db.commit()


@router.get("/analytics", response_model=List[FuelAnalytics])
def fuel_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicles = db.query(Vehicle).filter(Vehicle.owner_id == current_user.id).all()
    result = []
    for v in vehicles:
        logs = (db.query(FuelLog)
                .filter(FuelLog.vehicle_id == v.id, FuelLog.owner_id == current_user.id)
                .order_by(FuelLog.date.asc(), FuelLog.odometer_km.asc())
                .all())
        if not logs:
            continue

        total_litres = float(sum(l.litres for l in logs))
        total_spend  = float(sum(l.amount for l in logs))
        fill_count   = len(logs)

        kmpl_values = []
        for i in range(1, len(logs)):
            km_diff = float(logs[i].odometer_km) - float(logs[i-1].odometer_km)
            litres   = float(logs[i].litres)
            if km_diff > 0 and litres > 0:
                kmpl_values.append(km_diff / litres)

        avg_kmpl  = sum(kmpl_values) / len(kmpl_values) if kmpl_values else None
        last_kmpl = kmpl_values[-1] if kmpl_values else None

        anomaly     = False
        anomaly_pct = None
        if avg_kmpl and last_kmpl:
            drop_pct = (avg_kmpl - last_kmpl) / avg_kmpl * 100
            if drop_pct > 20:
                anomaly     = True
                anomaly_pct = round(drop_pct, 1)

        result.append(FuelAnalytics(
            vehicle_id=v.id,
            registration_number=v.registration_number,
            avg_kmpl=round(avg_kmpl, 2) if avg_kmpl else None,
            last_kmpl=round(last_kmpl, 2) if last_kmpl else None,
            anomaly=anomaly,
            anomaly_pct=anomaly_pct,
            total_litres=total_litres,
            total_spend=total_spend,
            fill_count=fill_count,
        ))

    return sorted(result, key=lambda x: x.anomaly, reverse=True)
