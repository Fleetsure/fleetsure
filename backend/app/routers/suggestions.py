"""
Phase 2 — Operational Intelligence: Real-time suggestions for trip creation.

Endpoints:
  GET /suggestions/vehicles?origin=<city>
      → Vehicles near the origin based on last completed trip destination.

  GET /suggestions/driver-fatigue?driver_id=<uuid>
      → Fatigue status for a driver based on recent trip history.
"""
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.driver import Driver
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])

LOOKBACK_DAYS   = 7    # how far back to look for last completed trip
FATIGUE_DAILY   = 2    # trips in last 24h that trigger caution
FATIGUE_WEEKLY  = 6    # trips in last 7 days that trigger warning


# ─────────────────────────────────────────────────────────────
# 1.  Empty-run / vehicle suggestions
# ─────────────────────────────────────────────────────────────

@router.get("/vehicles")
def suggest_vehicles(
    origin: str = Query(..., min_length=2, description="Trip origin city"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return active vehicles whose last completed trip destination
    matches (contains) the requested origin city.
    Sorted by recency — freshest first.
    """
    cutoff = date.today() - timedelta(days=LOOKBACK_DAYS)
    origin_q = f"%{origin.strip()}%"

    # Trips completed recently, destination matches the new origin
    recent_trips = (
        db.query(Trip)
        .filter(
            Trip.owner_id == current_user.id,
            Trip.status == TripStatus.COMPLETED,
            Trip.end_date >= cutoff,
            Trip.destination.ilike(origin_q),
        )
        .order_by(Trip.end_date.desc())
        .all()
    )

    seen_vehicles = set()
    suggestions = []

    for trip in recent_trips:
        if trip.vehicle_id in seen_vehicles:
            continue

        # Make sure vehicle is active and has no ongoing trip
        vehicle = db.query(Vehicle).filter(
            Vehicle.id == trip.vehicle_id,
            Vehicle.owner_id == current_user.id,
            Vehicle.status == VehicleStatus.ACTIVE,
        ).first()
        if not vehicle:
            continue

        active_trip = db.query(Trip).filter(
            Trip.vehicle_id == trip.vehicle_id,
            Trip.owner_id == current_user.id,
            Trip.status == TripStatus.IN_PROGRESS,
        ).first()
        if active_trip:
            continue

        idle_days = (date.today() - trip.end_date).days

        suggestions.append({
            "vehicle_id":          str(vehicle.id),
            "registration_number": vehicle.registration_number,
            "make":                vehicle.make,
            "model":               vehicle.model,
            "last_trip_from":      trip.origin,
            "last_trip_to":        trip.destination,
            "last_trip_date":      str(trip.end_date),
            "idle_days":           idle_days,
            "last_driver_name":    trip.driver_name,
            "last_driver_id":      str(trip.driver_id) if trip.driver_id else None,
            "reason":              f"Last trip ended at {trip.destination} — {idle_days} day{'s' if idle_days != 1 else ''} ago",
        })
        seen_vehicles.add(trip.vehicle_id)

    return {"origin": origin, "suggestions": suggestions}


# ─────────────────────────────────────────────────────────────
# 2.  Driver fatigue status
# ─────────────────────────────────────────────────────────────

@router.get("/driver-fatigue")
def driver_fatigue(
    driver_id: UUID = Query(..., description="Driver UUID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return fatigue status for a driver:
      available  → safe to assign
      caution    → approaching limit, assign with care
      blocked    → recommend rest before next trip
    """
    driver = db.query(Driver).filter(
        Driver.id == driver_id,
        Driver.owner_id == current_user.id,
    ).first()

    if not driver:
        return {"status": "unknown", "reason": "Driver not found"}

    today      = date.today()
    week_start = today - timedelta(days=7)

    # Trips in last 7 days (completed or in-progress)
    recent_trips = db.query(Trip).filter(
        Trip.driver_id == driver_id,
        Trip.owner_id  == current_user.id,
        Trip.start_date >= week_start,
        Trip.status.in_([TripStatus.COMPLETED, TripStatus.IN_PROGRESS]),
    ).order_by(Trip.start_date.desc()).all()

    trips_today = [t for t in recent_trips if t.start_date == today]
    trips_week  = recent_trips

    # Check for active trip right now
    active = next((t for t in recent_trips if t.status == TripStatus.IN_PROGRESS), None)

    if active:
        return {
            "status": "on_trip",
            "reason": f"Currently on trip: {active.origin} → {active.destination}",
            "trips_last_7_days": len(trips_week),
            "trips_today": len(trips_today),
        }

    if len(trips_week) >= FATIGUE_WEEKLY:
        return {
            "status": "blocked",
            "reason": f"{len(trips_week)} trips in the last 7 days — recommend at least 1 rest day before assigning.",
            "trips_last_7_days": len(trips_week),
            "trips_today": len(trips_today),
        }

    if len(trips_today) >= FATIGUE_DAILY:
        return {
            "status": "caution",
            "reason": f"Already completed {len(trips_today)} trip{'s' if len(trips_today) != 1 else ''} today — assign only if short haul.",
            "trips_last_7_days": len(trips_week),
            "trips_today": len(trips_today),
        }

    last_trip = recent_trips[0] if recent_trips else None
    return {
        "status": "available",
        "reason": "Driver is well-rested and available.",
        "last_trip_date": str(last_trip.start_date) if last_trip else None,
        "trips_last_7_days": len(trips_week),
        "trips_today": len(trips_today),
    }
