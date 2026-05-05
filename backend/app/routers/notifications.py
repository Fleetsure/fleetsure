"""
Notifications router:
- GET/PUT /notifications/settings  — user preferences
- POST /notifications/trigger/compliance  — daily cron trigger (secret-protected)
- POST /notifications/trigger/monthly     — monthly cron trigger (secret-protected)
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.notification_settings import NotificationSettings
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.notification_service import check_compliance_and_notify, send_monthly_summary

router = APIRouter(prefix="/notifications", tags=["Notifications"])

CRON_SECRET = os.getenv("CRON_SECRET", "fleetsure-cron-secret")


# ── Schemas ───────────────────────────────────────────────────────────────────

class NotificationSettingsUpdate(BaseModel):
    phone:                      Optional[str] = None
    email_compliance_alerts:    Optional[bool] = None
    email_monthly_summary:      Optional[bool] = None
    whatsapp_compliance_alerts: Optional[bool] = None
    whatsapp_monthly_summary:   Optional[bool] = None
    alert_days_before:          Optional[str] = None   # e.g. "30,15,7"


class NotificationSettingsResponse(BaseModel):
    phone:                      Optional[str]
    email_compliance_alerts:    bool
    email_monthly_summary:      bool
    whatsapp_compliance_alerts: bool
    whatsapp_monthly_summary:   bool
    alert_days_before:          str

    model_config = {"from_attributes": True}


# ── User-facing endpoints ─────────────────────────────────────────────────────

@router.get("/settings", response_model=NotificationSettingsResponse)
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(NotificationSettings).filter(
        NotificationSettings.owner_id == current_user.id
    ).first()
    if not settings:
        # Auto-create with defaults
        settings = NotificationSettings(owner_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/settings", response_model=NotificationSettingsResponse)
def update_notification_settings(
    payload: NotificationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(NotificationSettings).filter(
        NotificationSettings.owner_id == current_user.id
    ).first()
    if not settings:
        settings = NotificationSettings(owner_id=current_user.id)
        db.add(settings)

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings


# ── Cron trigger endpoints (called by cron-job.org daily/monthly) ─────────────

@router.post("/trigger/compliance")
def trigger_compliance_check(
    x_cron_secret: str = Header(default=""),
    db: Session = Depends(get_db),
):
    if x_cron_secret != CRON_SECRET:
        raise HTTPException(403, "Invalid cron secret")
    check_compliance_and_notify(db)
    return {"status": "ok", "message": "Compliance check triggered"}


@router.post("/trigger/monthly")
def trigger_monthly_summary(
    x_cron_secret: str = Header(default=""),
    db: Session = Depends(get_db),
):
    if x_cron_secret != CRON_SECRET:
        raise HTTPException(403, "Invalid cron secret")
    send_monthly_summary(db)
    return {"status": "ok", "message": "Monthly summary triggered"}


# ── Manual test send (authenticated) ─────────────────────────────────────────

@router.post("/test/compliance")
def test_compliance_email(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger compliance check for current user only."""
    from app.services.notification_service import check_compliance_and_notify
    check_compliance_and_notify(db)
    return {"status": "ok", "message": f"Test compliance alert triggered for {current_user.email}"}
