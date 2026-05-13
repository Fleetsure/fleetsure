"""
Phase 3 — Analytics Dashboard
Endpoints:
  GET /analytics/overview?days=30    → KPI summary
  GET /analytics/monthly             → last 6 months P&L
  GET /analytics/vehicles?days=30    → per-vehicle breakdown
  GET /analytics/expenses?days=30    → expense category breakdown
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.driver import Driver
from app.models.driver_payment import DriverPayment
from app.models.expense import Expense
from app.models.fuel_log import FuelLog
from app.models.insight import InsightSeverity, InsightType, OperationalInsight
from app.models.misc_expense import MiscExpense
from app.models.toll_log import TollLog
from app.models.trip import Trip, TripStatus
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _cutoff(days: int) -> date:
    return date.today() - timedelta(days=days)


def _total_expenses_for_trips(db: Session, trip_ids: list[UUID], owner_id: UUID) -> float:
    """Sum all expense sources for a list of trip_ids."""
    if not trip_ids:
        return 0.0

    exp = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.trip_id.in_(trip_ids)
    ).scalar() or 0

    fuel = db.query(func.coalesce(func.sum(FuelLog.amount), 0)).filter(
        FuelLog.trip_id.in_(trip_ids),
        FuelLog.owner_id == owner_id,
    ).scalar() or 0

    toll = db.query(func.coalesce(func.sum(TollLog.amount), 0)).filter(
        TollLog.trip_id.in_(trip_ids),
        TollLog.owner_id == owner_id,
    ).scalar() or 0

    misc = db.query(func.coalesce(func.sum(MiscExpense.amount), 0)).filter(
        MiscExpense.trip_id.in_(trip_ids),
        MiscExpense.owner_id == owner_id,
    ).scalar() or 0

    dp = db.query(func.coalesce(func.sum(DriverPayment.amount), 0)).filter(
        DriverPayment.trip_id.in_(trip_ids),
        DriverPayment.owner_id == owner_id,
    ).scalar() or 0

    return float(exp) + float(fuel) + float(toll) + float(misc) + float(dp)


# ─────────────────────────────────────────────────────────────
# 1. Overview — KPI summary
# ─────────────────────────────────────────────────────────────

@router.get("/overview")
def analytics_overview(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = _cutoff(days)
    owner_id = current_user.id

    completed_trips = (
        db.query(Trip)
        .filter(
            Trip.owner_id == owner_id,
            Trip.status == TripStatus.COMPLETED,
            Trip.end_date >= cutoff,
        )
        .all()
    )

    total_trips = len(completed_trips)
    total_revenue = sum(float(t.freight_amount or 0) for t in completed_trips)
    total_km = sum(float(t.distance_km or 0) for t in completed_trips)
    trip_ids = [t.id for t in completed_trips]
    total_expenses = _total_expenses_for_trips(db, trip_ids, owner_id)
    net_profit = total_revenue - total_expenses
    margin = round((net_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0
    avg_cpk = round(total_expenses / total_km, 2) if total_km > 0 else 0.0

    # Active vehicles
    active_vehicles = db.query(func.count(Vehicle.id)).filter(
        Vehicle.owner_id == owner_id,
        Vehicle.status == VehicleStatus.ACTIVE,
    ).scalar() or 0

    # Vehicles that had at least 1 completed trip in period
    active_in_period = len(set(t.vehicle_id for t in completed_trips))
    utilization_pct = round((active_in_period / active_vehicles * 100), 1) if active_vehicles > 0 else 0.0

    return {
        "period_days": days,
        "total_trips": total_trips,
        "total_revenue": round(total_revenue, 2),
        "total_expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "margin_pct": margin,
        "total_km": round(total_km, 2),
        "avg_cost_per_km": avg_cpk,
        "active_vehicles": active_vehicles,
        "utilization_pct": utilization_pct,
    }


# ─────────────────────────────────────────────────────────────
# 2. Monthly P&L — last 6 months
# ─────────────────────────────────────────────────────────────

@router.get("/monthly")
def analytics_monthly(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner_id = current_user.id
    today = date.today()

    months = []
    for i in range(5, -1, -1):
        # First and last day of each month going back 6 months
        month_date = date(today.year, today.month, 1) - timedelta(days=i * 30)
        month_start = date(month_date.year, month_date.month, 1)
        # Last day of month
        if month_date.month == 12:
            month_end = date(month_date.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(month_date.year, month_date.month + 1, 1) - timedelta(days=1)

        trips = (
            db.query(Trip)
            .filter(
                Trip.owner_id == owner_id,
                Trip.status == TripStatus.COMPLETED,
                Trip.end_date >= month_start,
                Trip.end_date <= month_end,
            )
            .all()
        )

        revenue = sum(float(t.freight_amount or 0) for t in trips)
        trip_ids = [t.id for t in trips]
        expenses = _total_expenses_for_trips(db, trip_ids, owner_id)
        profit = revenue - expenses

        months.append({
            "month": month_start.strftime("%b %Y"),
            "month_key": month_start.strftime("%Y-%m"),
            "trips": len(trips),
            "revenue": round(revenue, 2),
            "expenses": round(expenses, 2),
            "profit": round(profit, 2),
        })

    return {"months": months}


# ─────────────────────────────────────────────────────────────
# 3. Vehicle breakdown
# ─────────────────────────────────────────────────────────────

@router.get("/vehicles")
def analytics_vehicles(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = _cutoff(days)
    owner_id = current_user.id

    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id, Vehicle.status == VehicleStatus.ACTIVE)
        .all()
    )

    result = []
    for v in vehicles:
        trips = (
            db.query(Trip)
            .filter(
                Trip.owner_id == owner_id,
                Trip.vehicle_id == v.id,
                Trip.status == TripStatus.COMPLETED,
                Trip.end_date >= cutoff,
            )
            .all()
        )

        if not trips:
            result.append({
                "vehicle_id":          str(v.id),
                "registration_number": v.registration_number,
                "make":                v.make,
                "model":               v.model,
                "trips":               0,
                "revenue":             0.0,
                "expenses":            0.0,
                "profit":              0.0,
                "margin_pct":          0.0,
                "total_km":            0.0,
                "cost_per_km":         0.0,
            })
            continue

        trip_ids = [t.id for t in trips]
        revenue = sum(float(t.freight_amount or 0) for t in trips)
        expenses = _total_expenses_for_trips(db, trip_ids, owner_id)
        profit = revenue - expenses
        margin = round((profit / revenue * 100), 1) if revenue > 0 else 0.0
        total_km = sum(float(t.distance_km or 0) for t in trips)
        cpk = round(expenses / total_km, 2) if total_km > 0 else 0.0

        result.append({
            "vehicle_id":          str(v.id),
            "registration_number": v.registration_number,
            "make":                v.make,
            "model":               v.model,
            "trips":               len(trips),
            "revenue":             round(revenue, 2),
            "expenses":            round(expenses, 2),
            "profit":              round(profit, 2),
            "margin_pct":          margin,
            "total_km":            round(total_km, 2),
            "cost_per_km":         cpk,
        })

    # Sort: most profitable first
    result.sort(key=lambda x: x["profit"], reverse=True)
    return {"period_days": days, "vehicles": result}


# ─────────────────────────────────────────────────────────────
# 4. Expense category breakdown
# ─────────────────────────────────────────────────────────────

@router.get("/expenses")
def analytics_expenses(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = _cutoff(days)
    owner_id = current_user.id

    completed_trips = (
        db.query(Trip)
        .filter(
            Trip.owner_id == owner_id,
            Trip.status == TripStatus.COMPLETED,
            Trip.end_date >= cutoff,
        )
        .all()
    )
    trip_ids = [t.id for t in completed_trips]

    breakdown: dict[str, float] = defaultdict(float)

    if trip_ids:
        # Trip expenses (categorized)
        rows = db.query(Expense.expense_type, func.sum(Expense.amount)).filter(
            Expense.trip_id.in_(trip_ids)
        ).group_by(Expense.expense_type).all()
        for exp_type, total in rows:
            breakdown[exp_type] += float(total or 0)

        # Fuel logs
        fuel_total = db.query(func.coalesce(func.sum(FuelLog.amount), 0)).filter(
            FuelLog.trip_id.in_(trip_ids),
            FuelLog.owner_id == owner_id,
        ).scalar() or 0
        breakdown["fuel"] += float(fuel_total)

        # Toll logs
        toll_total = db.query(func.coalesce(func.sum(TollLog.amount), 0)).filter(
            TollLog.trip_id.in_(trip_ids),
            TollLog.owner_id == owner_id,
        ).scalar() or 0
        breakdown["toll"] += float(toll_total)

        # Misc expenses (categorized)
        misc_rows = db.query(MiscExpense.category, func.sum(MiscExpense.amount)).filter(
            MiscExpense.trip_id.in_(trip_ids),
            MiscExpense.owner_id == owner_id,
        ).group_by(MiscExpense.category).all()
        for cat, total in misc_rows:
            breakdown[cat or "other"] += float(total or 0)

        # Driver payments
        dp_total = db.query(func.coalesce(func.sum(DriverPayment.amount), 0)).filter(
            DriverPayment.trip_id.in_(trip_ids),
            DriverPayment.owner_id == owner_id,
        ).scalar() or 0
        breakdown["driver_payment"] += float(dp_total)

    total = sum(breakdown.values())

    categories = [
        {
            "category": cat,
            "label": _expense_label(cat),
            "amount": round(amount, 2),
            "pct": round((amount / total * 100), 1) if total > 0 else 0.0,
        }
        for cat, amount in sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
        if amount > 0
    ]

    return {
        "period_days": days,
        "total_expenses": round(total, 2),
        "categories": categories,
    }


def _expense_label(cat: str) -> str:
    labels = {
        "fuel":              "Fuel / HSD",
        "toll":              "Tolls",
        "rto":               "RTO",
        "police_challan":    "Police / Naka",
        "maintenance":       "Maintenance",
        "tyre":              "Tyres",
        "oil":               "Oil / Lubricants",
        "loading_unloading": "Loading / Unloading",
        "driver_payment":    "Driver Payments",
        "telephone":         "Telephone",
        "other":             "Other",
    }
    return labels.get(cat, cat.replace("_", " ").title())


# ─────────────────────────────────────────────────────────────
# 5. Daily Summary  (Phase 5 — WhatsApp)
# ─────────────────────────────────────────────────────────────

@router.get("/daily-summary")
def analytics_daily_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns a snapshot for today:
    - Active (in-progress) trips
    - Trips completed today + revenue
    - Critical + warning compliance alerts
    - Idle vehicles (no trip in last 7 days)
    Used to generate the owner's WhatsApp daily report.
    """
    owner_id = current_user.id
    today    = date.today()
    idle_cutoff = today - timedelta(days=7)

    # Active trips right now
    active_trips = (
        db.query(Trip)
        .filter(Trip.owner_id == owner_id, Trip.status == TripStatus.IN_PROGRESS)
        .all()
    )

    # Trips completed today
    completed_today = (
        db.query(Trip)
        .filter(
            Trip.owner_id == owner_id,
            Trip.status == TripStatus.COMPLETED,
            Trip.end_date == today,
        )
        .all()
    )

    revenue_today = sum(float(t.freight_amount or 0) for t in completed_today)

    # Planned trips (dispatched but not started)
    planned_trips = (
        db.query(Trip)
        .filter(Trip.owner_id == owner_id, Trip.status == TripStatus.PLANNED)
        .all()
    )

    # Compliance alerts — critical and warning, not dismissed
    compliance_alerts = (
        db.query(OperationalInsight)
        .filter(
            OperationalInsight.owner_id == owner_id,
            OperationalInsight.insight_type == InsightType.COMPLIANCE_EXPIRY,
            OperationalInsight.is_dismissed == False,  # noqa: E712
            OperationalInsight.severity.in_([InsightSeverity.CRITICAL, InsightSeverity.WARNING]),
        )
        .order_by(OperationalInsight.severity.desc())
        .limit(10)
        .all()
    )

    # Idle vehicles — active vehicles with no trip in last 7 days and no in-progress trip
    active_vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id, Vehicle.status == VehicleStatus.ACTIVE)
        .all()
    )
    idle_vehicles = []
    for v in active_vehicles:
        on_trip = db.query(Trip).filter(
            Trip.vehicle_id == v.id,
            Trip.owner_id == owner_id,
            Trip.status == TripStatus.IN_PROGRESS,
        ).first()
        if on_trip:
            continue
        last = db.query(Trip).filter(
            Trip.vehicle_id == v.id,
            Trip.owner_id == owner_id,
            Trip.status == TripStatus.COMPLETED,
        ).order_by(Trip.end_date.desc()).first()
        if last is None or last.end_date < idle_cutoff:
            idle_days = (today - last.end_date).days if last else None
            idle_vehicles.append({
                "registration_number": v.registration_number,
                "idle_days": idle_days,
            })

    return {
        "date":            str(today),
        "owner_name":      current_user.org_name or current_user.name or "Fleet Owner",
        "owner_phone":     current_user.phone,
        "active_trips": [
            {
                "origin":      t.origin,
                "destination": t.destination,
                "driver_name": t.driver_name,
                "reg_number":  next((v.registration_number for v in active_vehicles if v.id == t.vehicle_id), ""),
            }
            for t in active_trips
        ],
        "planned_trips_count":  len(planned_trips),
        "completed_today":      len(completed_today),
        "revenue_today":        round(revenue_today, 2),
        "compliance_alerts": [
            {
                "title":    a.title,
                "severity": a.severity.value,
            }
            for a in compliance_alerts
        ],
        "idle_vehicles": idle_vehicles[:5],  # cap at 5 for message length
        "total_active_vehicles": len(active_vehicles),
    }
