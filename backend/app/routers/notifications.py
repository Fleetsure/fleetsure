"""
Notification settings router.
GET  /notifications/settings          — fetch (or auto-create) user's notification prefs
PUT  /notifications/settings          — update prefs
POST /notifications/test/compliance   — send a test compliance alert email
"""

import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.db import supabase
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationSettings(BaseModel):
    phone:                      Optional[str]  = None
    email_compliance_alerts:    bool           = True
    email_monthly_summary:      bool           = True
    whatsapp_compliance_alerts: bool           = False
    whatsapp_monthly_summary:   bool           = False
    alert_days_before:          str            = "30,15,7"


def _get_or_create(owner_id: str) -> dict:
    res = supabase.table("notification_settings").select("*").eq("owner_id", owner_id).execute().data
    if res:
        return res[0]
    row = {"owner_id": owner_id}
    created = supabase.table("notification_settings").insert(row).execute().data
    return created[0] if created else row


@router.get("/settings")
def get_settings(current_user: dict = Depends(get_current_user)):
    return _get_or_create(current_user["id"])


@router.put("/settings")
def update_settings(body: NotificationSettings, current_user: dict = Depends(get_current_user)):
    owner_id = current_user["id"]
    _get_or_create(owner_id)   # ensure row exists
    updates = body.model_dump(exclude_none=True)
    res = supabase.table("notification_settings").update(updates).eq("owner_id", owner_id).execute().data
    return res[0] if res else updates


@router.post("/test/compliance")
def send_test_alert(current_user: dict = Depends(get_current_user)):
    """Send a test compliance alert email to the current user."""
    import smtplib
    from email.mime.text import MIMEText

    recipient = current_user.get("email")
    if not recipient:
        raise HTTPException(400, "No email address on your account")

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not smtp_user:
        raise HTTPException(503, "Email not configured on server")

    body = (
        f"Hi {current_user.get('name', 'there')},\n\n"
        "This is a test compliance alert from FleetSure.\n\n"
        "If you received this, your email notifications are working correctly.\n\n"
        "— FleetSure Team"
    )
    msg = MIMEText(body)
    msg["Subject"] = "FleetSure — Test Compliance Alert"
    msg["From"]    = smtp_user
    msg["To"]      = recipient

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.sendmail(smtp_user, [recipient], msg.as_string())
        return {"detail": "Test email sent", "recipient": recipient}
    except Exception as e:
        raise HTTPException(503, f"Failed to send email: {e}")
