from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from app.db import supabase
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _cutoff(days: int) -> str:
    return str(date.today() - timedelta(days=days))


def _sum_expenses_for_trips(owner_id: str, trip_ids: list) -> dict:
    """Return per-category totals for a list of trip_ids."""
    totals: dict[str, float] = defaultdict(float)
    if not trip_ids:
        return totals

    exps = supabase.table("expenses").select("expense_type,amount").in_("trip_id", trip_ids).execute().data
    for e in exps:
        totals[e.get("expense_type") or "other"] += float(e.get("amount") or 0)

    fuel = supabase.table("fuel_logs").select("amount").in_("trip_id", trip_ids).eq("owner_id", owner_id).execute().data
    totals["fuel"] += sum(float(f.get("amount") or 0) for f in fuel)

    tolls = supabase.table("toll_logs").select("amount").in_("trip_id", trip_ids).eq("owner_id", owner_id).execute().data
    totals["toll"] += sum(float(t.get("amount") or 0) for t in tolls)

    misc = supabase.table("misc_expenses").select("category,amount").in_("trip_id", trip_ids).eq("owner_id", owner_id).execute().data
    for m in misc:
        totals[m.get("category") or "other"] += float(m.get("amount") or 0)

    dp = supabase.table("driver_payments").select("amount").in_("trip_id", trip_ids).eq("owner_id", owner_id).execute().data
    totals["driver_payment"] += sum(float(d.get("amount") or 0) for d in dp)

    return totals


@router.get("/overview")
def analytics_overview(
    days: int = Query(default=30, ge=7, le=365),
    current_user: dict = Depends(get_current_user),
):
    owner = current_user["id"]
    cutoff = _cutoff(days)

    trips = (
        supabase.table("trips")
        .select("*")
        .eq("owner_id", owner)
        .eq("status", "completed")
        .gte("end_date", cutoff)
        .execute()
        .data
    )

    total_revenue = sum(float(t.get("freight_amount") or 0) for t in trips)
    total_km = sum(float(t.get("distance_km") or 0) for t in trips)
    trip_ids = [t["id"] for t in trips]

    expense_totals = _sum_expenses_for_trips(owner, trip_ids)
    total_expenses = sum(expense_totals.values())
    net_profit = total_revenue - total_expenses
    margin = round(net_profit / total_revenue * 100, 1) if total_revenue > 0 else 0.0
    avg_cpk = round(total_expenses / total_km, 2) if total_km > 0 else 0.0

    vehicles = supabase.table("vehicles").select("id,status").eq("owner_id", owner).execute().data
    active_vehicles = sum(1 for v in vehicles if v.get("status") == "active")
    active_in_period = len(set(t["vehicle_id"] for t in trips if t.get("vehicle_id")))
    utilization_pct = round(active_in_period / active_vehicles * 100, 1) if active_vehicles > 0 else 0.0

    return {
        "period_days": days,
        "total_trips": len(trips),
        "total_revenue": round(total_revenue, 2),
        "total_expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "margin_pct": margin,
        "total_km": round(total_km, 2),
        "avg_cost_per_km": avg_cpk,
        "active_vehicles": active_vehicles,
        "utilization_pct": utilization_pct,
    }


@router.get("/monthly")
def analytics_monthly(current_user: dict = Depends(get_current_user)):
    owner = current_user["id"]
    today = date.today()
    months = []

    for i in range(5, -1, -1):
        month_offset = (today.month - 1 - i) % 12 + 1
        year_offset = today.year + (today.month - 1 - i) // 12
        month_start = date(year_offset, month_offset, 1)
        if month_offset == 12:
            month_end = date(year_offset + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year_offset, month_offset + 1, 1) - timedelta(days=1)

        trips = (
            supabase.table("trips")
            .select("*")
            .eq("owner_id", owner)
            .eq("status", "completed")
            .gte("end_date", str(month_start))
            .lte("end_date", str(month_end))
            .execute()
            .data
        )

        revenue = sum(float(t.get("freight_amount") or 0) for t in trips)
        trip_ids = [t["id"] for t in trips]
        expense_totals = _sum_expenses_for_trips(owner, trip_ids)
        expenses = sum(expense_totals.values())
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


@router.get("/vehicles")
def analytics_vehicles(
    days: int = Query(default=30, ge=7, le=365),
    current_user: dict = Depends(get_current_user),
):
    owner = current_user["id"]
    cutoff = _cutoff(days)

    vehicles = supabase.table("vehicles").select("*").eq("owner_id", owner).execute().data
    result = []

    for v in vehicles:
        trips = (
            supabase.table("trips")
            .select("*")
            .eq("owner_id", owner)
            .eq("vehicle_id", v["id"])
            .eq("status", "completed")
            .gte("end_date", cutoff)
            .execute()
            .data
        )

        revenue = sum(float(t.get("freight_amount") or 0) for t in trips)
        trip_ids = [t["id"] for t in trips]
        expense_totals = _sum_expenses_for_trips(owner, trip_ids)
        expenses = sum(expense_totals.values())
        profit = revenue - expenses
        margin = round(profit / revenue * 100, 1) if revenue > 0 else 0.0
        total_km = sum(float(t.get("distance_km") or 0) for t in trips)
        cpk = round(expenses / total_km, 2) if total_km > 0 else 0.0

        result.append({
            "vehicle_id": v["id"],
            "registration_number": v.get("registration_number", ""),
            "make": v.get("make", ""),
            "model": v.get("model", ""),
            "trips": len(trips),
            "revenue": round(revenue, 2),
            "expenses": round(expenses, 2),
            "profit": round(profit, 2),
            "margin_pct": margin,
            "total_km": round(total_km, 2),
            "cost_per_km": cpk,
        })

    result.sort(key=lambda x: x["profit"], reverse=True)
    return {"period_days": days, "vehicles": result}


@router.get("/expenses")
def analytics_expenses(
    days: int = Query(default=30, ge=7, le=365),
    current_user: dict = Depends(get_current_user),
):
    owner = current_user["id"]
    cutoff = _cutoff(days)

    trips = (
        supabase.table("trips")
        .select("id")
        .eq("owner_id", owner)
        .eq("status", "completed")
        .gte("end_date", cutoff)
        .execute()
        .data
    )
    trip_ids = [t["id"] for t in trips]
    breakdown = _sum_expenses_for_trips(owner, trip_ids)
    total = sum(breakdown.values())

    categories = [
        {
            "category": cat,
            "label": _expense_label(cat),
            "amount": round(amount, 2),
            "pct": round(amount / total * 100, 1) if total > 0 else 0.0,
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
        "fuel": "Fuel / HSD",
        "toll": "Tolls",
        "rto": "RTO",
        "police_challan": "Police / Naka",
        "maintenance": "Maintenance",
        "tyre": "Tyres",
        "oil": "Oil / Lubricants",
        "loading_unloading": "Loading / Unloading",
        "driver_payment": "Driver Payments",
        "telephone": "Telephone",
        "other": "Other",
    }
    return labels.get(cat, cat.replace("_", " ").title())


@router.get("/daily-summary")
def analytics_daily_summary(current_user: dict = Depends(get_current_user)):
    owner = current_user["id"]
    today = date.today()
    idle_cutoff = str(today - timedelta(days=7))

    active_trips = (
        supabase.table("trips").select("*").eq("owner_id", owner).eq("status", "in_progress").execute().data
    )
    completed_today = (
        supabase.table("trips").select("*").eq("owner_id", owner).eq("status", "completed").eq("end_date", str(today)).execute().data
    )
    planned_trips = (
        supabase.table("trips").select("id").eq("owner_id", owner).eq("status", "planned").execute().data
    )

    revenue_today = sum(float(t.get("freight_amount") or 0) for t in completed_today)

    all_vehicles = supabase.table("vehicles").select("*").eq("owner_id", owner).execute().data
    drivers = supabase.table("drivers").select("*").eq("owner_id", owner).execute().data

    CRITICAL_DAYS = 15
    WARNING_DAYS = 30
    compliance_alerts = []

    for v in all_vehicles:
        for field, label in [("insurance_expiry", "Insurance"), ("fitness_expiry", "Fitness Certificate"),
                              ("puc_expiry", "PUC"), ("permit_expiry", "Permit")]:
            val = v.get(field)
            if not val:
                continue
            days_left = (date.fromisoformat(str(val)) - today).days
            if days_left <= CRITICAL_DAYS:
                severity = "critical"
            elif days_left <= WARNING_DAYS:
                severity = "warning"
            else:
                continue
            suffix = f"EXPIRED {abs(days_left)}d ago" if days_left < 0 else f"expires in {days_left}d"
            compliance_alerts.append({"title": f"{v.get('registration_number')} {label} — {suffix}", "severity": severity})

    for d in drivers:
        for field, label in [("license_expiry", "DL"), ("transport_validity", "Transport Endorsement")]:
            val = d.get(field)
            if not val:
                continue
            days_left = (date.fromisoformat(str(val)) - today).days
            if days_left <= CRITICAL_DAYS:
                severity = "critical"
            elif days_left <= WARNING_DAYS:
                severity = "warning"
            else:
                continue
            suffix = f"EXPIRED {abs(days_left)}d ago" if days_left < 0 else f"expires in {days_left}d"
            compliance_alerts.append({"title": f"{d.get('name')} {label} — {suffix}", "severity": severity})

    compliance_alerts.sort(key=lambda x: 0 if x["severity"] == "critical" else 1)
    compliance_alerts = compliance_alerts[:10]

    veh_map = {v["id"]: v.get("registration_number", "") for v in all_vehicles}
    idle_vehicles = []
    for v in all_vehicles:
        on_trip = any(t.get("vehicle_id") == v["id"] for t in active_trips)
        if on_trip:
            continue
        last_trips = (
            supabase.table("trips").select("end_date").eq("vehicle_id", v["id"]).eq("owner_id", owner).eq("status", "completed").order("end_date", desc=True).limit(1).execute().data
        )
        last_end = last_trips[0]["end_date"] if last_trips else None
        if not last_end or last_end < idle_cutoff:
            idle_days = (today - date.fromisoformat(last_end)).days if last_end else None
            idle_vehicles.append({"registration_number": v.get("registration_number"), "idle_days": idle_days})

    return {
        "date": str(today),
        "owner_name": current_user.get("org_name") or current_user.get("name") or "Fleet Owner",
        "owner_phone": current_user.get("phone"),
        "active_trips": [
            {
                "origin": t.get("origin"),
                "destination": t.get("destination"),
                "driver_name": t.get("driver_name"),
                "reg_number": veh_map.get(t.get("vehicle_id"), ""),
            }
            for t in active_trips
        ],
        "planned_trips_count": len(planned_trips),
        "completed_today": len(completed_today),
        "revenue_today": round(revenue_today, 2),
        "compliance_alerts": compliance_alerts,
        "idle_vehicles": idle_vehicles[:5],
        "total_active_vehicles": len(all_vehicles),
    }
