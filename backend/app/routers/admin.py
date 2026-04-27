"""
One-time admin migration endpoint.
Assigns all orphaned records (owner_id IS NULL) to the oldest user account.
DELETE this router after running once.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/migrate-owner-ids")
def migrate_owner_ids(secret: str, db: Session = Depends(get_db)):
    # Basic protection — must pass secret in query param
    if secret != "fleetsure-migrate-2024":
        return {"error": "unauthorized"}

    # Find the oldest user (most likely the one who added data)
    oldest = db.execute(
        text("SELECT id, email, name FROM users ORDER BY created_at ASC LIMIT 1")
    ).fetchone()

    if not oldest:
        return {"error": "no users found"}

    uid = str(oldest.id)
    tables = [
        "vehicles", "trips", "fuel_logs",
        "driver_payments", "parties",
        "insurance_policies", "documents", "drivers"
    ]

    results = {"assigned_to": {"id": uid, "email": oldest.email, "name": oldest.name}}
    for table in tables:
        try:
            r = db.execute(
                text(f"UPDATE {table} SET owner_id = :uid WHERE owner_id IS NULL"),
                {"uid": uid}
            )
            db.commit()
            results[table] = f"{r.rowcount} rows updated"
        except Exception as e:
            db.rollback()
            results[table] = f"error: {e}"

    return results
