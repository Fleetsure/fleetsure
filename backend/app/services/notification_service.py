"""
Notification Service — Email (Resend) + WhatsApp (AiSensy)
"""
import os
import httpx
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.fuel_log import FuelLog
from app.models.toll_log import TollLog
from app.models.tyre_log import TyreLog
from app.models.misc_expense import MiscExpense
from app.models.trip import Trip
from app.models.expense import Expense
from app.models.notification_settings import NotificationSettings
from app.models.user import User

RESEND_API_KEY   = os.getenv("RESEND_API_KEY", "")
AISENSY_API_KEY  = os.getenv("AISENSY_API_KEY", "")
FROM_EMAIL       = os.getenv("FROM_EMAIL", "alerts@fleetsure.co.in")
FROM_NAME        = "FleetSure Alerts"


# ── Email via Resend ──────────────────────────────────────────────────────────

def send_email(to: str, subject: str, html: str) -> bool:
    if not RESEND_API_KEY:
        print(f"[Notifications] RESEND_API_KEY not set — skipping email to {to}")
        return False
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": f"{FROM_NAME} <{FROM_EMAIL}>", "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        if resp.status_code == 200:
            print(f"[Notifications] Email sent to {to}: {subject}")
            return True
        print(f"[Notifications] Email failed {resp.status_code}: {resp.text}")
        return False
    except Exception as e:
        print(f"[Notifications] Email error: {e}")
        return False


# ── WhatsApp via AiSensy ──────────────────────────────────────────────────────

def send_whatsapp(phone: str, template_name: str, params: list[str]) -> bool:
    if not AISENSY_API_KEY:
        print(f"[Notifications] AISENSY_API_KEY not set — skipping WhatsApp to {phone}")
        return False
    try:
        resp = httpx.post(
            "https://backend.aisensy.com/campaign/t1/api/v2",
            headers={"Content-Type": "application/json"},
            json={
                "apiKey": AISENSY_API_KEY,
                "campaignName": template_name,
                "destination": phone,
                "userName": FROM_NAME,
                "templateParams": params,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            print(f"[Notifications] WhatsApp sent to {phone}")
            return True
        print(f"[Notifications] WhatsApp failed {resp.status_code}: {resp.text}")
        return False
    except Exception as e:
        print(f"[Notifications] WhatsApp error: {e}")
        return False


# ── Email HTML Templates ──────────────────────────────────────────────────────

def _compliance_email_html(user_name: str, alerts: list[dict]) -> str:
    rows = ""
    for a in alerts:
        color = "#b71c1c" if a["days_left"] < 0 else ("#e65100" if a["days_left"] <= 7 else "#f57f17")
        status = "EXPIRED" if a["days_left"] < 0 else f"{a['days_left']} days left"
        rows += f"""
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5;font-weight:600;color:#1E2D8E">{a['reg']}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5">{a['doc_type']}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5">{a['expiry_date']}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5;font-weight:700;color:{color}">{status}</td>
        </tr>"""

    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8eaf6">
      <div style="background:#1E2D8E;padding:24px 28px">
        <div style="color:white;font-size:20px;font-weight:700">FleetSure</div>
        <div style="color:#8fa0d8;font-size:13px;margin-top:2px">Fleet Management Platform</div>
      </div>
      <div style="padding:24px 28px">
        <h2 style="color:#1a1a2e;margin:0 0 6px;font-size:18px">Compliance Alert 🚨</h2>
        <p style="color:#666;font-size:14px;margin:0 0 20px">Hi {user_name}, the following documents require your attention:</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e8eaf6;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f8f9ff">
              <th style="padding:10px 14px;text-align:left;font-size:12px;color:#888;font-weight:700;text-transform:uppercase">Vehicle</th>
              <th style="padding:10px 14px;text-align:left;font-size:12px;color:#888;font-weight:700;text-transform:uppercase">Document</th>
              <th style="padding:10px 14px;text-align:left;font-size:12px;color:#888;font-weight:700;text-transform:uppercase">Expiry</th>
              <th style="padding:10px 14px;text-align:left;font-size:12px;color:#888;font-weight:700;text-transform:uppercase">Status</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <div style="margin-top:24px;text-align:center">
          <a href="https://fleetsure.co.in/fleet-health"
             style="display:inline-block;background:#1E2D8E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
            View Fleet Health Dashboard →
          </a>
        </div>
      </div>
      <div style="padding:16px 28px;background:#f8f9ff;font-size:12px;color:#aaa;text-align:center">
        You're receiving this because compliance alerts are enabled in your FleetSure account.<br>
        <a href="https://fleetsure.co.in/settings?tab=notifications" style="color:#1E2D8E">Manage notification preferences</a>
      </div>
    </div>"""


def _monthly_summary_email_html(user_name: str, month: str, summary: dict) -> str:
    vehicle_rows = ""
    for v in summary.get("vehicles", []):
        vehicle_rows += f"""
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5;font-weight:600;color:#1E2D8E">{v['reg']}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5">₹{v['fuel']:,.0f}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5">₹{v['tolls']:,.0f}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5">₹{v['tyres']:,.0f}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5">₹{v['misc']:,.0f}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f5;font-weight:700;color:#1E2D8E">₹{v['total']:,.0f}</td>
        </tr>"""

    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8eaf6">
      <div style="background:#1E2D8E;padding:24px 28px">
        <div style="color:white;font-size:20px;font-weight:700">FleetSure</div>
        <div style="color:#8fa0d8;font-size:13px;margin-top:2px">Monthly Expense Summary — {month}</div>
      </div>
      <div style="padding:24px 28px">
        <h2 style="color:#1a1a2e;margin:0 0 6px;font-size:18px">Monthly Summary 📊</h2>
        <p style="color:#666;font-size:14px;margin:0 0 20px">Hi {user_name}, here's your fleet expense summary for <strong>{month}</strong>:</p>

        <div style="display:flex;gap:12px;margin-bottom:24px">
          {"".join([f'<div style="flex:1;background:#f8f9ff;border-radius:10px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:800;color:#1E2D8E">₹{s["value"]:,.0f}</div><div style="font-size:11px;color:#888;margin-top:3px">{s["label"]}</div></div>' for s in [
              {"label": "Total Spend", "value": summary.get("total", 0)},
              {"label": "Trips", "value": summary.get("trip_count", 0)},
              {"label": "Freight Earned", "value": summary.get("freight", 0)},
          ]])}
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e8eaf6;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f8f9ff">
              <th style="padding:10px 14px;text-align:left;font-size:11px;color:#888;font-weight:700;text-transform:uppercase">Vehicle</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;color:#888;font-weight:700;text-transform:uppercase">Fuel</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;color:#888;font-weight:700;text-transform:uppercase">Tolls</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;color:#888;font-weight:700;text-transform:uppercase">Tyres</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;color:#888;font-weight:700;text-transform:uppercase">Misc</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;color:#888;font-weight:700;text-transform:uppercase">Total</th>
            </tr>
          </thead>
          <tbody>{vehicle_rows}</tbody>
        </table>
        <div style="margin-top:24px;text-align:center">
          <a href="https://fleetsure.co.in/reports"
             style="display:inline-block;background:#1E2D8E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
            Download Full Report →
          </a>
        </div>
      </div>
      <div style="padding:16px 28px;background:#f8f9ff;font-size:12px;color:#aaa;text-align:center">
        Monthly summaries are sent on the 1st of each month.<br>
        <a href="https://fleetsure.co.in/settings?tab=notifications" style="color:#1E2D8E">Manage notification preferences</a>
      </div>
    </div>"""


# ── Core notification logic ───────────────────────────────────────────────────

def check_compliance_and_notify(db: Session):
    """Run daily — check all expiring docs and send alerts."""
    today = date.today()
    users = db.query(User).filter(User.is_active == True).all()

    for user in users:
        settings = db.query(NotificationSettings).filter(
            NotificationSettings.owner_id == user.id
        ).first()

        if not settings:
            continue

        thresholds = [int(d.strip()) for d in settings.alert_days_before.split(",") if d.strip().isdigit()]
        alerts = []

        # Check vehicles
        vehicles = db.query(Vehicle).filter(Vehicle.owner_id == user.id).all()
        for v in vehicles:
            for doc_type, expiry in [
                ("Insurance", v.insurance_expiry),
                ("Fitness Certificate", v.fitness_expiry),
                ("PUC", v.puc_expiry),
                ("Permit", v.permit_expiry),
            ]:
                if not expiry:
                    continue
                days_left = (expiry - today).days
                if days_left < 0 or days_left in thresholds:
                    alerts.append({
                        "reg": v.registration_number,
                        "doc_type": doc_type,
                        "expiry_date": expiry.strftime("%d %b %Y"),
                        "days_left": days_left,
                    })

        # Check drivers
        drivers = db.query(Driver).filter(Driver.owner_id == user.id).all()
        for d in drivers:
            for doc_type, expiry in [
                ("License", d.license_expiry),
                ("Transport Validity", d.transport_validity),
            ]:
                if not expiry:
                    continue
                days_left = (expiry - today).days
                if days_left < 0 or days_left in thresholds:
                    alerts.append({
                        "reg": f"Driver: {d.name}",
                        "doc_type": doc_type,
                        "expiry_date": expiry.strftime("%d %b %Y"),
                        "days_left": days_left,
                    })

        if not alerts:
            continue

        # Send email
        if settings.email_compliance_alerts:
            html = _compliance_email_html(user.name, alerts)
            send_email(user.email, f"⚠️ Compliance Alert — {len(alerts)} document(s) need attention", html)

        # Send WhatsApp
        if settings.whatsapp_compliance_alerts and settings.phone:
            summary_text = f"{len(alerts)} document(s) expiring soon"
            send_whatsapp(
                phone=settings.phone,
                template_name="compliance_alert",
                params=[user.name, summary_text, "FleetSure dashboard", "fleetsure.co.in/fleet-health"],
            )


def send_monthly_summary(db: Session):
    """Run on 1st of each month — send expense summary."""
    from datetime import datetime
    today = date.today()
    # Summary for previous month
    first_of_this_month = today.replace(day=1)
    last_month_end = first_of_this_month - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    month_label = last_month_end.strftime("%B %Y")

    users = db.query(User).filter(User.is_active == True).all()

    for user in users:
        settings = db.query(NotificationSettings).filter(
            NotificationSettings.owner_id == user.id
        ).first()
        if not settings:
            continue
        if not settings.email_monthly_summary and not settings.whatsapp_monthly_summary:
            continue

        vehicles = db.query(Vehicle).filter(Vehicle.owner_id == user.id).all()
        if not vehicles:
            continue

        vehicle_summaries = []
        total_spend = 0
        for v in vehicles:
            fuel  = sum(float(f.amount) for f in db.query(FuelLog).filter(
                FuelLog.vehicle_id == v.id, FuelLog.date >= last_month_start, FuelLog.date <= last_month_end).all())
            tolls = sum(float(t.amount) for t in db.query(TollLog).filter(
                TollLog.vehicle_id == v.id, TollLog.date >= last_month_start, TollLog.date <= last_month_end).all())
            tyres = sum(float(t.amount) for t in db.query(TyreLog).filter(
                TyreLog.vehicle_id == v.id, TyreLog.date >= last_month_start, TyreLog.date <= last_month_end).all())
            misc  = sum(float(m.amount) for m in db.query(MiscExpense).filter(
                MiscExpense.vehicle_id == v.id, MiscExpense.date >= last_month_start, MiscExpense.date <= last_month_end).all())
            total = fuel + tolls + tyres + misc
            if total > 0:
                vehicle_summaries.append({"reg": v.registration_number, "fuel": fuel, "tolls": tolls, "tyres": tyres, "misc": misc, "total": total})
                total_spend += total

        trips = db.query(Trip).filter(
            Trip.owner_id == user.id,
            Trip.start_date >= last_month_start,
            Trip.start_date <= last_month_end,
        ).all()
        freight = sum(float(t.freight_amount or 0) for t in trips)

        summary = {
            "vehicles": vehicle_summaries,
            "total": total_spend,
            "trip_count": len(trips),
            "freight": freight,
        }

        if settings.email_monthly_summary:
            html = _monthly_summary_email_html(user.name, month_label, summary)
            send_email(user.email, f"📊 FleetSure Monthly Summary — {month_label}", html)

        if settings.whatsapp_monthly_summary and settings.phone:
            send_whatsapp(
                phone=settings.phone,
                template_name="monthly_summary",
                params=[user.name, month_label, f"{total_spend:,.0f}", str(len(vehicles))],
            )
