"""
Billing & Subscription router — powered by Razorpay.
GET  /billing/status            — current plan + days left
POST /billing/subscribe/{plan}  — create subscription, return hosted payment URL
POST /billing/webhook           — Razorpay webhook handler
POST /billing/cancel            — cancel active subscription
"""

import os
import hmac
import hashlib
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel

from app.db import supabase
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])

RAZORPAY_KEY_ID         = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET     = os.getenv("RAZORPAY_KEY_SECRET", "")
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

TRIAL_DAYS = 60


def get_razorpay_client():
    try:
        import razorpay
        return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except ImportError:
        raise HTTPException(500, "Razorpay SDK not installed")


def get_or_create_subscription(user_id: str) -> dict:
    res = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute().data
    if res:
        return res[0]
    trial_end = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()
    new_sub = {
        "user_id": user_id,
        "plan": "trial",
        "status": "trial",
        "trial_ends_at": trial_end,
    }
    created = supabase.table("subscriptions").insert(new_sub).execute().data
    return created[0]


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


@router.get("/status", response_model=BillingStatus)
def get_billing_status(current_user: dict = Depends(get_current_user)):
    sub = get_or_create_subscription(current_user["id"])
    now = datetime.now(timezone.utc)

    days_left = None
    if sub.get("status") in ("trial", "created") and sub.get("trial_ends_at"):
        trial_end = datetime.fromisoformat(sub["trial_ends_at"].replace("Z", "+00:00"))
        days_left = max(0, (trial_end - now).days)
    elif sub.get("current_period_end"):
        period_end = datetime.fromisoformat(sub["current_period_end"].replace("Z", "+00:00"))
        days_left = max(0, (period_end - now).days)

    display_plan = sub["plan"] if sub.get("status") != "created" else "trial"

    return BillingStatus(
        plan=display_plan,
        plan_name=PLAN_NAMES.get(display_plan, display_plan.title()),
        status=sub.get("status", "trial"),
        trial_ends_at=sub.get("trial_ends_at"),
        current_period_end=sub.get("current_period_end"),
        days_left=days_left,
        razorpay_subscription_id=sub.get("razorpay_subscription_id"),
    )


@router.post("/subscribe/{plan}", response_model=SubscribeResponse)
def create_subscription(plan: str, current_user: dict = Depends(get_current_user)):
    if plan not in PLAN_IDS:
        raise HTTPException(400, f"Invalid plan. Choose: {list(PLAN_IDS.keys())}")

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(500, "Razorpay not configured — contact support")

    client = get_razorpay_client()
    sub = get_or_create_subscription(current_user["id"])

    if sub.get("razorpay_subscription_id"):
        try:
            client.subscription.cancel(sub["razorpay_subscription_id"], {"cancel_at_cycle_end": 0})
        except Exception:
            pass

    notify_info: dict = {"notify_email": current_user.get("email", "")}
    if current_user.get("phone"):
        notify_info["notify_phone"] = current_user["phone"]

    try:
        rz_sub = client.subscription.create({
            "plan_id": PLAN_IDS[plan],
            "total_count": 12,
            "quantity": 1,
            "customer_notify": 1,
            "notify_info": notify_info,
        })
    except Exception as e:
        raise HTTPException(502, f"Razorpay error: {e}")

    supabase.table("subscriptions").update({
        "plan": plan,
        "status": "created",
        "razorpay_subscription_id": rz_sub["id"],
    }).eq("user_id", current_user["id"]).execute()

    return SubscribeResponse(
        subscription_id=rz_sub["id"],
        short_url=rz_sub.get("short_url", ""),
        plan=plan,
    )


@router.post("/cancel")
def cancel_subscription(current_user: dict = Depends(get_current_user)):
    res = supabase.table("subscriptions").select("*").eq("user_id", current_user["id"]).execute().data
    if not res or not res[0].get("razorpay_subscription_id"):
        raise HTTPException(404, "No active subscription found")

    sub = res[0]
    client = get_razorpay_client()
    try:
        client.subscription.cancel(sub["razorpay_subscription_id"], {"cancel_at_cycle_end": 1})
    except Exception as e:
        raise HTTPException(502, f"Razorpay error: {e}")

    supabase.table("subscriptions").update({"status": "cancelled"}).eq("user_id", current_user["id"]).execute()
    return {"status": "cancelled", "message": "Subscription will end at current billing period"}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    body = await request.body()

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

    res = supabase.table("subscriptions").select("*").eq("razorpay_subscription_id", rz_sub_id).execute().data
    if not res:
        return {"status": "not_found"}

    updates = {}
    if event_type == "subscription.charged":
        updates["status"] = "active"
        period_end = sub_entity.get("current_end")
        if period_end:
            updates["current_period_end"] = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()

    elif event_type in ("subscription.cancelled", "subscription.completed"):
        updates["status"] = "cancelled"

    elif event_type == "subscription.halted":
        updates["status"] = "past_due"

    elif event_type == "subscription.activated":
        updates["status"] = "active"
        period_end = sub_entity.get("current_end")
        if period_end:
            updates["current_period_end"] = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()

    if updates:
        supabase.table("subscriptions").update(updates).eq("razorpay_subscription_id", rz_sub_id).execute()

    return {"status": "ok"}
