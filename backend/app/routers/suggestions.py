from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.db import supabase
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])

LOOKBACK_DAYS = 7
FATIGUE_DAILY = 2
FATIGUE_WEEKLY = 6


@router.get("/vehicles")
def suggest_vehicles(
    origin: str = Query(..., min_length=2),
    current_user: dict = Depends(get_current_user),
):
    owner = current_user["id"]
    cutoff = str(date.today() - timedelta(days=LOOKBACK_DAYS))

    recent_trips = (
        supabase.table("trips")
        .select("*")
        .eq("owner_id", owner)
        .eq("status", "completed")
        .gte("end_date", cutoff)
        .execute()
        .data
    )

    origin_lower = origin.strip().lower()
    matching = [t for t in recent_trips if origin_lower in (t.get("destination") or "").lower()]
    matching.sort(key=lambda t: t.get("end_date") or "", reverse=True)

    seen_vehicles = set()
    suggestions = []

    for trip in matching:
        vid = trip.get("vehicle_id")
        if not vid or vid in seen_vehicles:
            continue

        vehicle_res = supabase.table("vehicles").select("*").eq("id", vid).eq("owner_id", owner).execute().data
        if not vehicle_res:
            continue
        vehicle = vehicle_res[0]

        on_trip = supabase.table("trips").select("id").eq("vehicle_id", vid).eq("owner_id", owner).eq("status", "in_progress").execute().data
        if on_trip:
            continue

        idle_days = (date.today() - date.fromisoformat(trip["end_date"])).days if trip.get("end_date") else None

        suggestions.append({
            "vehicle_id": vehicle["id"],
            "registration_number": vehicle.get("registration_number", ""),
            "make": vehicle.get("make", ""),
            "model": vehicle.get("model", ""),
            "last_trip_from": trip.get("origin"),
            "last_trip_to": trip.get("destination"),
            "last_trip_date": trip.get("end_date"),
            "idle_days": idle_days,
            "last_driver_name": trip.get("driver_name"),
            "last_driver_id": trip.get("driver_id"),
            "reason": f"Last trip ended at {trip.get('destination')} — {idle_days} day{'s' if idle_days != 1 else ''} ago",
        })
        seen_vehicles.add(vid)

    return {"origin": origin, "suggestions": suggestions}


@router.get("/driver-fatigue")
def driver_fatigue(
    driver_id: UUID = Query(...),
    current_user: dict = Depends(get_current_user),
):
    owner = current_user["id"]
    driver_res = supabase.table("drivers").select("*").eq("id", str(driver_id)).eq("owner_id", owner).execute().data
    if not driver_res:
        return {"status": "unknown", "reason": "Driver not found"}

    today = date.today()
    week_start = str(today - timedelta(days=7))

    recent_trips = (
        supabase.table("trips")
        .select("*")
        .eq("driver_id", str(driver_id))
        .eq("owner_id", owner)
        .gte("start_date", week_start)
        .in_("status", ["completed", "in_progress"])
        .order("start_date", desc=True)
        .execute()
        .data
    )

    trips_today = [t for t in recent_trips if t.get("start_date") == str(today)]
    active = next((t for t in recent_trips if t.get("status") == "in_progress"), None)

    if active:
        return {
            "status": "on_trip",
            "reason": f"Currently on trip: {active.get('origin')} → {active.get('destination')}",
            "trips_last_7_days": len(recent_trips),
            "trips_today": len(trips_today),
        }

    if len(recent_trips) >= FATIGUE_WEEKLY:
        return {
            "status": "blocked",
            "reason": f"{len(recent_trips)} trips in the last 7 days — recommend at least 1 rest day.",
            "trips_last_7_days": len(recent_trips),
            "trips_today": len(trips_today),
        }

    if len(trips_today) >= FATIGUE_DAILY:
        return {
            "status": "caution",
            "reason": f"Already completed {len(trips_today)} trip{'s' if len(trips_today) != 1 else ''} today.",
            "trips_last_7_days": len(recent_trips),
            "trips_today": len(trips_today),
        }

    last_trip = recent_trips[0] if recent_trips else None
    return {
        "status": "available",
        "reason": "Driver is well-rested and available.",
        "last_trip_date": last_trip.get("start_date") if last_trip else None,
        "trips_last_7_days": len(recent_trips),
        "trips_today": len(trips_today),
    }
