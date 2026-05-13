"""
Operational Intelligence Engine — Phase 2 + Phase 4
Detects: idle vehicles, unrecorded expenses, cost-per-km anomalies, fuel anomalies,
         compliance expiry (insurance, fitness, PUC, permit, driver license).
Called on-demand via POST /insights/refresh.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.driver import Driver
from app.models.fuel_log import FuelLog
from app.models.insight import InsightSeverity, InsightType, OperationalInsight
from app.models.insurance import InsurancePolicy
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

        no_trips = last_trip is None
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

            if no_trips:
                title = f"{v.registration_number}: no trips recorded yet"
                body  = "This vehicle has no trips logged. Assign a trip to start tracking it."
                severity = InsightSeverity.INFO
            elif idle_days >= 30:
                title = f"{v.registration_number} idle for {idle_days} days"
                body  = f"No completed trip in {idle_days} days. Check if the vehicle is operational or needs servicing."
                severity = InsightSeverity.WARNING
            else:
                title = f"{v.registration_number} idle for {idle_days} day{'s' if idle_days != 1 else ''}"
                body  = "No completed trip recently. Consider assigning a new trip."
                severity = InsightSeverity.INFO

            _create(
                db, owner_id,
                insight_type=InsightType.IDLE_VEHICLE,
                severity=severity,
                title=title,
                body=body,
                vehicle_id=v.id,
                meta={"registration_number": v.registration_number, "idle_days": idle_days if not no_trips else None},
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
# 4. Fuel Anomaly Detection
# ─────────────────────────────────────────────────────────────

FUEL_ANOMALY_DROP = 0.75   # flag if latest km/L < 75% of vehicle average
FUEL_MIN_LOGS    = 3       # need at least this many logs for a reliable baseline


def detect_fuel_anomaly(db: Session, owner_id: UUID) -> int:
    """
    For each vehicle with enough fuel logs, compare the latest fill-up's
    fuel efficiency (km/L) against the vehicle's historical average.
    Flag if it drops more than 25%.
    """
    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id, Vehicle.status == VehicleStatus.ACTIVE)
        .all()
    )

    count = 0
    for v in vehicles:
        logs = (
            db.query(FuelLog)
            .filter(
                FuelLog.vehicle_id == v.id,
                FuelLog.owner_id == owner_id,
                FuelLog.odometer_km.isnot(None),
                FuelLog.litres > 0,
            )
            .order_by(FuelLog.odometer_km.asc())
            .all()
        )

        if len(logs) < FUEL_MIN_LOGS:
            continue

        efficiencies = []
        for i in range(1, len(logs)):
            km_driven = float(logs[i].odometer_km) - float(logs[i - 1].odometer_km)
            litres    = float(logs[i].litres)
            if km_driven > 10 and litres > 0:   # sanity check
                efficiencies.append((km_driven / litres, logs[i]))

        if len(efficiencies) < FUEL_MIN_LOGS - 1:
            continue

        avg_kpl  = sum(e[0] for e in efficiencies) / len(efficiencies)
        latest_kpl, latest_log = efficiencies[-1]

        if avg_kpl <= 0:
            continue

        drop_pct = (avg_kpl - latest_kpl) / avg_kpl

        if drop_pct >= (1 - FUEL_ANOMALY_DROP):   # ≥ 25% drop
            severity = InsightSeverity.WARNING if drop_pct >= 0.40 else InsightSeverity.INFO
            _create(
                db, owner_id,
                insight_type=InsightType.FUEL_ANOMALY,
                severity=severity,
                title=f"{v.registration_number}: fuel efficiency dropped {drop_pct * 100:.0f}%",
                body=(
                    f"Latest fill-up: {latest_kpl:.1f} km/L vs vehicle average {avg_kpl:.1f} km/L. "
                    f"Possible causes: tyre pressure, engine issue, pump skimming, or route change. "
                    f"Log date: {latest_log.date}."
                ),
                vehicle_id=v.id,
                meta={
                    "registration_number": v.registration_number,
                    "latest_kpl": round(latest_kpl, 2),
                    "avg_kpl": round(avg_kpl, 2),
                    "drop_pct": round(drop_pct * 100, 1),
                    "log_date": str(latest_log.date),
                },
            )
            count += 1

    return count


# ─────────────────────────────────────────────────────────────
# 5. Compliance Expiry Detection  (Phase 4)
# ─────────────────────────────────────────────────────────────

# Days-before-expiry thresholds
COMPLIANCE_CRITICAL_DAYS = 15   # ≤ 15 days (or already expired) → CRITICAL
COMPLIANCE_WARNING_DAYS  = 30   # 16–30 days → WARNING
COMPLIANCE_INFO_DAYS     = 60   # 31–60 days → INFO  (beyond 60 = no alert)

_DOC_LABELS = {
    "insurance": "Insurance",
    "fitness":   "Fitness Certificate",
    "puc":       "PUC Certificate",
    "permit":    "Permit",
    "license":   "Driver License",
    "transport": "Transport Endorsement",
}


def _compliance_severity_and_body(days_left: int, doc_label: str, entity: str) -> tuple[InsightSeverity, str, str]:
    """Return (severity, title_suffix, body) based on days_left."""
    if days_left < 0:
        return (
            InsightSeverity.CRITICAL,
            f"EXPIRED {abs(days_left)}d ago",
            f"{doc_label} for {entity} expired {abs(days_left)} days ago. Immediate renewal required to avoid penalties.",
        )
    if days_left == 0:
        return (
            InsightSeverity.CRITICAL,
            "expires TODAY",
            f"{doc_label} for {entity} expires today. Renew immediately.",
        )
    if days_left <= COMPLIANCE_CRITICAL_DAYS:
        return (
            InsightSeverity.CRITICAL,
            f"expires in {days_left}d",
            f"{doc_label} for {entity} expires in {days_left} days. Renew urgently to avoid challan.",
        )
    if days_left <= COMPLIANCE_WARNING_DAYS:
        return (
            InsightSeverity.WARNING,
            f"expires in {days_left}d",
            f"{doc_label} for {entity} expires in {days_left} days. Schedule renewal soon.",
        )
    return (
        InsightSeverity.INFO,
        f"expires in {days_left}d",
        f"{doc_label} for {entity} expires in {days_left} days.",
    )


def detect_compliance_alerts(db: Session, owner_id: UUID) -> int:
    """
    Check vehicle compliance dates (insurance, fitness, PUC, permit) and
    driver license/transport validity.
    Creates an insight for anything expiring within COMPLIANCE_INFO_DAYS days
    or already expired.
    """
    today = date.today()
    count = 0

    # ── Vehicles ──────────────────────────────────────────────
    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.owner_id == owner_id, Vehicle.status == VehicleStatus.ACTIVE)
        .all()
    )

    vehicle_doc_fields = [
        ("insurance", "insurance_expiry"),
        ("fitness",   "fitness_expiry"),
        ("puc",       "puc_expiry"),
        ("permit",    "permit_expiry"),
    ]

    for v in vehicles:
        for doc_key, field in vehicle_doc_fields:
            expiry: Optional[date] = getattr(v, field)
            if expiry is None:
                continue
            days_left = (expiry - today).days
            if days_left > COMPLIANCE_INFO_DAYS:
                continue

            doc_label = _DOC_LABELS[doc_key]
            severity, suffix, body = _compliance_severity_and_body(days_left, doc_label, v.registration_number)

            _create(
                db, owner_id,
                insight_type=InsightType.COMPLIANCE_EXPIRY,
                severity=severity,
                title=f"{v.registration_number} {doc_label} {suffix}",
                body=body,
                vehicle_id=v.id,
                meta={
                    "doc_type":            doc_key,
                    "registration_number": v.registration_number,
                    "expiry_date":         str(expiry),
                    "days_left":           days_left,
                },
            )
            count += 1

        # Also check InsurancePolicy table (may have more precise records)
        policies = (
            db.query(InsurancePolicy)
            .filter(
                InsurancePolicy.vehicle_id == v.id,
                InsurancePolicy.owner_id == owner_id,
            )
            .all()
        )
        for pol in policies:
            days_left = (pol.expiry_date - today).days
            if days_left > COMPLIANCE_INFO_DAYS:
                continue
            pol_label = pol.policy_type.value.replace("_", " ").title()
            severity, suffix, body = _compliance_severity_and_body(days_left, pol_label, v.registration_number)
            _create(
                db, owner_id,
                insight_type=InsightType.COMPLIANCE_EXPIRY,
                severity=severity,
                title=f"{v.registration_number} {pol_label} {suffix}",
                body=body,
                vehicle_id=v.id,
                meta={
                    "doc_type":            pol.policy_type.value,
                    "registration_number": v.registration_number,
                    "policy_number":       pol.policy_number,
                    "expiry_date":         str(pol.expiry_date),
                    "days_left":           days_left,
                },
            )
            count += 1

    # ── Drivers ───────────────────────────────────────────────
    drivers = (
        db.query(Driver)
        .filter(Driver.owner_id == owner_id, Driver.status != "inactive")
        .all()
    )

    driver_doc_fields = [
        ("license",   "license_expiry",      "Driver License"),
        ("transport", "transport_validity",  "Transport Endorsement"),
    ]

    for d in drivers:
        for doc_key, field, label in driver_doc_fields:
            expiry: Optional[date] = getattr(d, field)
            if expiry is None:
                continue
            days_left = (expiry - today).days
            if days_left > COMPLIANCE_INFO_DAYS:
                continue

            severity, suffix, body = _compliance_severity_and_body(days_left, label, d.name)

            _create(
                db, owner_id,
                insight_type=InsightType.COMPLIANCE_EXPIRY,
                severity=severity,
                title=f"{d.name} {label} {suffix}",
                body=body,
                driver_id=d.id,
                meta={
                    "doc_type":    doc_key,
                    "driver_name": d.name,
                    "expiry_date": str(expiry),
                    "days_left":   days_left,
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

    idle       = detect_idle_vehicles(db, owner_id)
    nudges     = check_unrecorded_expenses(db, owner_id)
    cpk        = compute_cost_per_km_insights(db, owner_id)
    fuel       = detect_fuel_anomaly(db, owner_id)
    compliance = detect_compliance_alerts(db, owner_id)

    db.commit()

    return {
        "idle_vehicle_insights":       idle,
        "unrecorded_expense_insights": nudges,
        "cost_per_km_insights":        cpk,
        "fuel_anomaly_insights":       fuel,
        "compliance_alerts":           compliance,
        "total":                       idle + nudges + cpk + fuel + compliance,
    }
