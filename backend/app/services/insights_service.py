"""
Operational Intelligence Engine — Phase 1
Detects: idle vehicles, unrecorded expenses, cost-per-km anomalies.
Called on-demand via POST /insights/refresh and at login.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.fuel_log import FuelLog
from app.models.insight import InsightSeverity, InsightType, OperationalInsight
from app.models.misc_expense import MiscExpense
from app.models.toll_log import TollLog
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle, VehicleStatus


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _create(db: Session, owner_id: UUID, **kwargs) -> OperationalInsight:
    ins = OperationalInsight(owner_id=owner_id, **kwargs)
    db.add(ins)
    return ins


def _days_since(d: Optional[date]) -> int:
    if d is None:
        return 9999
    return (date.today() - d).days


# ─────────────────────────────────────────────────────────────
# 1. Idle Vehicle Detection
# ─────────────────────────────────────────────────────────────

IDLE_THRESHOLD_DAYS = 7   # configurable per org in future


def detect_idle_vehicles(db: Session, owner_id: UUID) -> int:
    """
    Flag active vehicles with no completed trip in last IDLE_THRESHOLD_DAYS days.
    Returns count of insights created.
    """
    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id, Vehicle.status == VehicleStatus.ACTIVE)
        .all()
    )

    count = 0
    for v in vehicles:
        last_trip = (
            db.query(Trip)
            .filter(
                Trip.vehicle_id == v.id,
                Trip.owner_id == owner_id,
                Trip.status == TripStatus.COMPLETED,
            )
            .order_by(Trip.end_date.desc())
            .first()
        )

        idle_days = _days_since(last_trip.end_date if last_trip else None)

        if idle_days >= IDLE_THRESHOLD_DAYS:
            # Check there's no in-progress trip right now
            active = (
                db.query(Trip)
                .filter(
                    Trip.vehicle_id == v.id,
                    Trip.owner_id == owner_id,
                    Trip.status == TripStatus.IN_PROGRESS,
                )
                .first()
            )
            if active:
                continue

            if idle_days >= 9999:
                body = "No trips recorded yet. Assign a trip to start tracking this vehicle."
                severity = InsightSeverity.INFO
            elif idle_days >= 30:
                body = f"Idle for {idle_days} days. Check if vehicle is operational or needs servicing."
                severity = InsightSeverity.WARNING
            else:
                body = f"No completed trip in {idle_days} days. Consider assigning a new trip."
                severity = InsightSeverity.INFO

            _create(
                db, owner_id,
                insight_type=InsightType.IDLE_VEHICLE,
                severity=severity,
                title=f"{v.registration_number} has been idle for {idle_days} day{'s' if idle_days != 1 else ''}",
                body=body,
                vehicle_id=v.id,
                meta={"registration_number": v.registration_number, "idle_days": idle_days},
            )
            count += 1

    return count


# ─────────────────────────────────────────────────────────────
# 2. Unrecorded Expense Nudges
# ─────────────────────────────────────────────────────────────

LOOKBACK_DAYS = 30   # only check trips completed in last N days


def check_unrecorded_expenses(db: Session, owner_id: UUID) -> int:
    """
    For each recently completed trip, check for missing fuel / toll records.
    """
    cutoff = date.today() - timedelta(days=LOOKBACK_DAYS)

    completed_trips = (
        db.query(Trip)
        .filter(
            Trip.owner_id == owner_id,
            Trip.status == TripStatus.COMPLETED,
            Trip.end_date >= cutoff,
        )
        .order_by(Trip.end_date.desc())
        .all()
    )

    count = 0
    for trip in completed_trips:
        nudges: list[str] = []

        # Check fuel log
        fuel_exists = (
            db.query(FuelLog)
            .filter(FuelLog.trip_id == trip.id, FuelLog.owner_id == owner_id)
            .first()
        )
        if not fuel_exists:
            nudges.append("No fuel fill-up recorded for this trip.")

        # Check toll log (only flag if trip has distance or is long-haul)
        dist = float(trip.distance_km or 0)
        if dist >= 100:
            toll_exists = (
                db.query(TollLog)
                .filter(TollLog.trip_id == trip.id, TollLog.owner_id == owner_id)
                .first()
            )
            if not toll_exists:
                nudges.append("No toll entry found for this long-distance trip.")

        if nudges:
            trip_label = f"{trip.origin} → {trip.destination}"
            _create(
                db, owner_id,
                insight_type=InsightType.UNRECORDED_EXPENSE,
                severity=InsightSeverity.WARNING,
                title=f"Possible missing expenses: {trip_label}",
                body=" ".join(nudges),
                vehicle_id=trip.vehicle_id,
                trip_id=trip.id,
                meta={
                    "trip_label": trip_label,
                    "end_date": str(trip.end_date),
                    "nudges": nudges,
                },
            )
            count += 1

    return count


# ─────────────────────────────────────────────────────────────
# 3. Cost-per-km Insights
# ─────────────────────────────────────────────────────────────

CPK_PERIOD_DAYS = 30
CPK_WARNING_THRESHOLD = 45.0   # ₹/km — above this is high for Indian trucks
CPK_INFO_THRESHOLD   = 30.0


def compute_cost_per_km_insights(db: Session, owner_id: UUID) -> int:
    """
    For each vehicle, compute cost-per-km over last 30 days.
    Creates an insight with the computed figure + flag if above threshold.
    Requires at least 1 trip with distance_km to be meaningful.
    """
    cutoff = date.today() - timedelta(days=CPK_PERIOD_DAYS)

    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id, Vehicle.status == VehicleStatus.ACTIVE)
        .all()
    )

    count = 0
    for v in vehicles:
        # Total km from completed trips with distance_km
        trips = (
            db.query(Trip)
            .filter(
                Trip.vehicle_id == v.id,
                Trip.owner_id == owner_id,
                Trip.status == TripStatus.COMPLETED,
                Trip.end_date >= cutoff,
                Trip.distance_km.isnot(None),
                Trip.distance_km > 0,
            )
            .all()
        )

        if not trips:
            continue

        total_km = sum(float(t.distance_km) for t in trips)
        if total_km < 100:   # too little data to be meaningful
            continue

        # Sum all expenses for this vehicle in the period
        fuel_cost = db.query(func.coalesce(func.sum(FuelLog.amount), 0)).filter(
            FuelLog.vehicle_id == v.id,
            FuelLog.owner_id == owner_id,
            FuelLog.date >= cutoff,
        ).scalar() or 0

        toll_cost = db.query(func.coalesce(func.sum(TollLog.amount), 0)).filter(
            TollLog.vehicle_id == v.id,
            TollLog.owner_id == owner_id,
            TollLog.date >= cutoff,
        ).scalar() or 0

        misc_cost = db.query(func.coalesce(func.sum(MiscExpense.amount), 0)).filter(
            MiscExpense.vehicle_id == v.id,
            MiscExpense.owner_id == owner_id,
            MiscExpense.date >= cutoff,
        ).scalar() or 0

        total_cost = float(fuel_cost) + float(toll_cost) + float(misc_cost)
        if total_cost == 0:
            continue

        cpk = total_cost / total_km

        if cpk >= CPK_WARNING_THRESHOLD:
            severity = InsightSeverity.WARNING
            body = (
                f"₹{cpk:.1f}/km over last 30 days — above the typical range of ₹18–35/km. "
                f"Total cost: ₹{total_cost:,.0f} over {total_km:.0f} km. "
                f"Check fuel efficiency, toll routes, and misc charges."
            )
        elif cpk >= CPK_INFO_THRESHOLD:
            severity = InsightSeverity.INFO
            body = (
                f"₹{cpk:.1f}/km over last 30 days. "
                f"Total cost: ₹{total_cost:,.0f} over {total_km:.0f} km."
            )
        else:
            severity = InsightSeverity.INFO
            body = (
                f"₹{cpk:.1f}/km over last 30 days — good efficiency. "
                f"Total cost: ₹{total_cost:,.0f} over {total_km:.0f} km."
            )

        _create(
            db, owner_id,
            insight_type=InsightType.COST_PER_KM,
            severity=severity,
            title=f"{v.registration_number}: ₹{cpk:.1f}/km this month",
            body=body,
            vehicle_id=v.id,
            meta={
                "registration_number": v.registration_number,
                "cost_per_km": round(cpk, 2),
                "total_cost": round(total_cost, 2),
                "total_km": round(total_km, 2),
                "fuel_cost": round(float(fuel_cost), 2),
                "toll_cost": round(float(toll_cost), 2),
                "misc_cost": round(float(misc_cost), 2),
                "period_days": CPK_PERIOD_DAYS,
            },
        )
        count += 1

    return count


# ─────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────

def refresh_insights(db: Session, owner_id: UUID) -> dict:
    """
    Re-run all detectors for a given owner.
    Clears existing non-dismissed insights first to avoid duplicates.
    Returns summary of what was generated.
    """
    # Clear stale auto-generated insights (keep dismissed ones)
    db.query(OperationalInsight).filter(
        OperationalInsight.owner_id == owner_id,
        OperationalInsight.is_dismissed == False,  # noqa: E712
    ).delete(synchronize_session=False)

    idle    = detect_idle_vehicles(db, owner_id)
    nudges  = check_unrecorded_expenses(db, owner_id)
    cpk     = compute_cost_per_km_insights(db, owner_id)

    db.commit()

    return {
        "idle_vehicle_insights": idle,
        "unrecorded_expense_insights": nudges,
        "cost_per_km_insights": cpk,
        "total": idle + nudges + cpk,
    }
