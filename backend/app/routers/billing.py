"""
Billing & Subscription router — powered by Razorpay.
GET  /billing/status            — current plan + days left
POST /billing/subscribe/{plan}  — create subscription, return hosted payment URL
POST /billing/webhook           — Razorpay webhook handler (called by Razorpay servers)
POST /billing/cancel            — cancel active subscription
"""

import os
import hmac
import hashlib
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])

# ── Razorpay config ────────────────────────────────────────────────────────────

RAZORPAY_KEY_ID      = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET  = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

PLAN_IDS = {
    "starter": "plan_Sm8pLrW0jisOKq",
    "growth":  "plan_Sm8psu9C1DWpTp",
    "pro":     "plan_Sm8rtNslW8XEVS",
}

PLAN_NAMES = {
    "trial":   "Free Trial",
    "starter": "Starter",
    "growth":  "Growth",
    "pro":     "Pro",
}

TRIAL_DAYS = 14


def get_razorpay_client():
    try:
        import razorpay
        return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except ImportError:
        raise HTTPException(500, "Razorpay SDK not installed")


def get_or_create_subscription(db: Session, user: User) -> Subscription:
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        trial_end = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)
        sub = Subscription(
            user_id=user.id,
            plan="trial",
            status="trial",
            trial_ends_at=trial_end,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


# ── Schemas ────────────────────────────────────────────────────────────────────

class BillingStatus(BaseModel):
    plan: str
    plan_name: str
    status: str
    trial_ends_at: Optional[str] = None
    current_period_end: Optional[str] = None
    days_left: Optional[int] = None
    razorpay_subscription_id: Optional[str] = None


class SubscribeResponse(BaseModel):
    subscription_id: str
    short_url: str
    plan: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/status", response_model=BillingStatus)
def get_billing_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = get_or_create_subscription(db, current_user)
    now = datetime.now(timezone.utc)

    days_left = None
    if sub.status == "trial" and sub.trial_ends_at:
        delta = sub.trial_ends_at - now
        days_left = max(0, delta.days)
    elif sub.current_period_end:
        delta = sub.current_period_end - now
        days_left = max(0, delta.days)

    return BillingStatus(
        plan=sub.plan,
        plan_name=PLAN_NAMES.get(sub.plan, sub.plan.title()),
        status=sub.status,
        trial_ends_at=sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        days_left=days_left,
        razorpay_subscription_id=sub.razorpay_subscription_id,
    )


@router.post("/subscribe/{plan}", response_model=SubscribeResponse)
def create_subscription(
    plan: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if plan not in PLAN_IDS:
        raise HTTPException(400, f"Invalid plan. Choose: {list(PLAN_IDS.keys())}")

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(500, "Razorpay not configured — contact support")

    client = get_razorpay_client()

    # Cancel existing Razorpay subscription if upgrading
    sub = get_or_create_subscription(db, current_user)
    if sub.razorpay_subscription_id:
        try:
            client.subscription.cancel(sub.razorpay_subscription_id, {"cancel_at_cycle_end": 0})
        except Exception:
            pass  # Ignore cancel errors — proceed with new subscription

    # Create new Razorpay subscription
    notify_info: dict = {"notify_email": current_user.email}
    if hasattr(current_user, "phone") and current_user.phone:
        notify_info["notify_phone"] = current_user.phone

    try:
        rz_sub = client.subscription.create({
            "plan_id": PLAN_IDS[plan],
            "total_count": 12,        # 12 billing cycles (1 year)
            "quantity": 1,
            "customer_notify": 1,
            "notify_info": notify_info,
        })
    except Exception as e:
        raise HTTPException(502, f"Razorpay error: {e}")

    # Save to DB
    sub.plan                    = plan
    sub.status                  = "created"
    sub.razorpay_subscription_id = rz_sub["id"]
    db.commit()

    return SubscribeResponse(
        subscription_id=rz_sub["id"],
        short_url=rz_sub.get("short_url", ""),
        plan=plan,
    )


@router.post("/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or not sub.razorpay_subscription_id:
        raise HTTPException(404, "No active subscription found")

    client = get_razorpay_client()
    try:
        client.subscription.cancel(sub.razorpay_subscription_id, {"cancel_at_cycle_end": 1})
    except Exception as e:
        raise HTTPException(502, f"Razorpay error: {e}")

    sub.status = "cancelled"
    db.commit()
    return {"status": "cancelled", "message": "Subscription will end at current billing period"}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Razorpay calls this on every subscription event.
    Configure in Razorpay Dashboard → Settings → Webhooks:
      URL: https://<your-render-url>/api/v1/billing/webhook
      Events: subscription.charged, subscription.cancelled, subscription.halted
    """
    body = await request.body()

    # Verify signature if webhook secret is configured
    if RAZORPAY_WEBHOOK_SECRET:
        sig = request.headers.get("X-Razorpay-Signature", "")
        expected = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(400, "Invalid webhook signature")

    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    event_type = event.get("event", "")
    payload    = event.get("payload", {})
    sub_entity = payload.get("subscription", {}).get("entity", {})
    rz_sub_id  = sub_entity.get("id")

    if not rz_sub_id:
        return {"status": "ignored"}

    sub = db.query(Subscription).filter(
        Subscription.razorpay_subscription_id == rz_sub_id
    ).first()
    if not sub:
        return {"status": "not_found"}

    if event_type == "subscription.charged":
        sub.status = "active"
        # Update period end from Razorpay payload
        period_end = sub_entity.get("current_end")
        if period_end:
            sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

    elif event_type in ("subscription.cancelled", "subscription.completed"):
        sub.status = "cancelled"

    elif event_type == "subscription.halted":
        sub.status = "past_due"

    elif event_type == "subscription.activated":
        sub.status = "active"
        period_end = sub_entity.get("current_end")
        if period_end:
            sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

    db.commit()
    return {"status": "ok"}
