from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.expense import Expense
from app.models.fuel_log import FuelLog

router = APIRouter(prefix="/pnl", tags=["P&L"])


class VehiclePnL(BaseModel):
    vehicle_id: str
    reg_number: str
    make: str
    model: str
    total_trips: int
    completed_trips: int
    total_revenue: float
    total_trip_expenses: float
    total_fuel_cost: float
    total_expenses: float
    profit: float
    margin_percent: float
    is_profitable: bool

    class Config:
        from_attributes = True


@router.get("/vehicles", response_model=List[VehiclePnL])
def get_vehicle_pnl(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    result = []

    for v in vehicles:
        # All trips for this vehicle
        all_trips = db.query(Trip).filter(Trip.vehicle_id == v.id).all()
        completed = [t for t in all_trips if t.status == "completed"]

        # Revenue from completed trips
        total_revenue = sum(float(t.freight_amount or 0) for t in completed)

        # Trip expenses (fuel, tolls, etc. logged against trips)
        trip_ids = [t.id for t in all_trips]
        trip_expenses = Decimal("0")
        if trip_ids:
            rows = db.query(func.sum(Expense.amount)).filter(
                Expense.trip_id.in_(trip_ids)
            ).scalar()
            trip_expenses = Decimal(str(rows or 0))

        # Fuel costs from FuelLog (standalone fill-ups)
        fuel_rows = db.query(func.sum(FuelLog.amount)).filter(
            FuelLog.vehicle_id == v.id
        ).scalar()
        total_fuel = Decimal(str(fuel_rows or 0))

        total_expenses = float(trip_expenses) + float(total_fuel)
        profit = total_revenue - total_expenses
        margin = round((profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

        result.append(VehiclePnL(
            vehicle_id=str(v.id),
            reg_number=v.reg_number,
            make=v.make or "",
            model=v.model or "",
            total_trips=len(all_trips),
            completed_trips=len(completed),
            total_revenue=round(total_revenue, 2),
            total_trip_expenses=float(round(trip_expenses, 2)),
            total_fuel_cost=float(round(total_fuel, 2)),
            total_expenses=round(total_expenses, 2),
            profit=round(profit, 2),
            margin_percent=margin,
            is_profitable=profit > 0,
        ))

    # Sort by profit descending
    result.sort(key=lambda x: x.profit, reverse=True)
    return result
