from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import io, base64
from datetime import date
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.database import get_db
from app.models.trip import Trip
from app.models.user import User
from app.services.auth_service import get_current_user

# ── Register Unicode fonts (supports ₹) ───────────────────────────────────────
import os as _os
_FONT_DIR = _os.path.join(_os.path.dirname(_os.path.dirname(__file__)), "fonts")
try:
    pdfmetrics.registerFont(TTFont("DJ",  _os.path.join(_FONT_DIR, "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DJB", _os.path.join(_FONT_DIR, "DejaVuSans-Bold.ttf")))
    FONT, FONTB = "DJ", "DJB"
except Exception as _e:
    print(f"Font load failed: {_e}, falling back to Helvetica")
    FONT, FONTB = "Helvetica", "Helvetica-Bold"

router = APIRouter(prefix="/trips", tags=["PDF"])

# ── Colors ─────────────────────────────────────────────────────────────────────
BLUE   = colors.HexColor("#1E2D8E")
LBLUE  = colors.HexColor("#e8eaf6")
GRAY   = colors.HexColor("#888888")
LGRAY  = colors.HexColor("#f5f5f5")
DARK   = colors.HexColor("#1a1a2e")
GREEN  = colors.HexColor("#2e7d32")
RED    = colors.HexColor("#c62828")
GOLD   = colors.HexColor("#F5A623")
WHITE  = colors.white
BORDER = colors.HexColor("#e0e0e0")


def P(text, font=None, size=9, color=DARK, align=TA_LEFT, **kw):
    return Paragraph(str(text), ParagraphStyle(
        "x", fontName=font or FONT, fontSize=size,
        textColor=color, alignment=align,
        leading=size * 1.3, **kw
    ))


def _fmt_date(d) -> str:
    if not d: return "—"
    if isinstance(d, str): return d
    return d.strftime("%d %b %Y")


def _inr(amount) -> str:
    if amount is None: return "—"
    return f"₹{float(amount):,.0f}"


def build_trip_pdf(trip: Trip, org_name: str, org_logo_b64: str,
                   include_expense_types: list, show_profit: bool) -> bytes:
    buffer = io.BytesIO()
    W_PAGE = A4[0]
    W = W_PAGE - 36 * mm

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=14*mm, bottomMargin=14*mm,
    )
    story = []

    # ── 1. HEADER — Org branding ───────────────────────────────────────────────
    # Left: logo + company name
    logo_cell = []
    if org_logo_b64:
        try:
            img_data = base64.b64decode(org_logo_b64.split(",")[-1])
            img_buf  = io.BytesIO(img_data)
            logo_img = RLImage(img_buf, width=40, height=40)
            logo_cell.append(logo_img)
        except Exception:
            pass

    org_display = org_name or "Fleet Company"
    header_left = Table(
        [[P(org_display, font=FONTB, size=16, color=WHITE)],
         [P("Transport & Logistics", size=8, color=colors.HexColor("#c5cae9"))]],
        colWidths=[W * 0.55]
    )
    header_right = Table(
        [[P("TRIP SHEET", font=FONTB, size=13, color=WHITE, align=TA_RIGHT)],
         [P(f"Doc: {trip.doc_number or '—'}   Date: {_fmt_date(trip.start_date)}",
            size=8, color=colors.HexColor("#c5cae9"), align=TA_RIGHT)]],
        colWidths=[W * 0.45]
    )

    if logo_cell:
        left_content = Table([[logo_cell[0],
                               Table([[P(org_display, font=FONTB, size=14, color=WHITE)],
                                      [P("Transport & Logistics", size=8, color=colors.HexColor("#c5cae9"))]],
                                     colWidths=[W*0.45])]],
                             colWidths=[44, W*0.45])
        left_content.setStyle(TableStyle([
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("LEFTPADDING",(0,0),(-1,-1),0),
            ("RIGHTPADDING",(0,0),(-1,-1),6),
            ("TOPPADDING",(0,0),(-1,-1),0),
            ("BOTTOMPADDING",(0,0),(-1,-1),0),
        ]))
    else:
        left_content = header_left

    banner = Table([[left_content, header_right]], colWidths=[W*0.55, W*0.45])
    banner.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), BLUE),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(-1,-1), 16),
        ("RIGHTPADDING",  (0,0),(-1,-1), 16),
        ("TOPPADDING",    (0,0),(-1,-1), 14),
        ("BOTTOMPADDING", (0,0),(-1,-1), 14),
        ("ROUNDEDCORNERS", [8,8,8,8]),
    ]))
    story.append(banner)
    # Gold accent strip
    accent = Table([[""]], colWidths=[W])
    accent.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), GOLD),
        ("TOPPADDING",    (0,0),(-1,-1), 2),
        ("BOTTOMPADDING", (0,0),(-1,-1), 2),
    ]))
    story.append(accent)
    story.append(Spacer(1, 6))

    # ── 2. ROUTE BANNER ───────────────────────────────────────────────────────
    route = Table([[
        P(trip.origin.upper(),      font=FONTB, size=14, color=BLUE),
        P("→", size=16, color=GRAY, align=TA_CENTER),
        P(trip.destination.upper(), font=FONTB, size=14, color=BLUE, align=TA_RIGHT),
    ]], colWidths=[W*0.44, W*0.12, W*0.44])
    route.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), LBLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 12),
        ("BOTTOMPADDING", (0,0),(-1,-1), 12),
        ("LEFTPADDING",   (0,0),(-1,-1), 16),
        ("RIGHTPADDING",  (0,0),(-1,-1), 16),
        ("ROUNDEDCORNERS", [8,8,8,8]),
    ]))
    story.append(route)
    story.append(Spacer(1, 14))

    # ── 3. TRIP DETAILS ────────────────────────────────────────────────────────
    def lv(label, val):
        return [P(label, size=8, color=GRAY), P(val or "—", font=FONTB, size=9)]

    v = trip.vehicle
    details = [
        lv("Vehicle No.",   v.registration_number if v else "—"),
        lv("Vehicle",       f"{v.make} {v.model}" if v else "—"),
        lv("Driver Name",   trip.driver_name),
        lv("Driver Phone",  trip.driver_phone),
        lv("Start Date",    _fmt_date(trip.start_date)),
        lv("End Date",      _fmt_date(trip.end_date)),
        lv("Distance",      f"{trip.distance_km} km" if trip.distance_km else None),
        lv("Material",      trip.material),
        lv("Weight",        f"{trip.weight_tonnes} Tonnes" if trip.weight_tonnes else None),
        lv("Doc Number",    trip.doc_number),
    ]
    # Filter out blank entries
    details = [d for d in details if d[1].text != "—"]

    # 2-column grid
    rows = []
    for i in range(0, len(details), 2):
        l, r = details[i], (details[i+1] if i+1 < len(details) else [P(""), P("")])
        rows.append([l[0], l[1], P(""), r[0], r[1]])

    dtable = Table(rows, colWidths=[W*0.17, W*0.30, W*0.06, W*0.17, W*0.30])
    dtable.setStyle(TableStyle([
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 3),
        ("BOTTOMPADDING", (0,0),(-1,-1), 3),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
    ]))

    story.append(P("▌  TRIP DETAILS", font=FONTB, size=8, color=BLUE, spaceAfter=4))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6))
    story.append(dtable)
    story.append(Spacer(1, 14))

    # ── 4. CHARGES / EXPENSES ─────────────────────────────────────────────────
    story.append(P("▌  CHARGES", font=FONTB, size=8, color=BLUE, spaceAfter=4))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6))

    freight = float(trip.freight_amount or 0)
    total_shown_exp = 0.0

    # Header row
    charge_rows = [[
        P("Description", font=FONTB, size=8, color=WHITE),
        P("Amount",      font=FONTB, size=8, color=WHITE, align=TA_RIGHT),
    ]]

    # Freight row
    charge_rows.append([
        P("Freight Charge", font=FONTB, size=9),
        P(_inr(freight),    font=FONTB, size=9, align=TA_RIGHT),
    ])

    # Selected expenses
    shown_exps = [e for e in (trip.expenses or [])
                  if "all" in include_expense_types or e.expense_type in include_expense_types]
    shown_exps.sort(key=lambda e: e.date)

    for e in shown_exps:
        label = e.expense_type.replace("_", " ").title()
        if e.description:
            label += f" — {e.description}"
        charge_rows.append([
            P(label,         size=9, color=DARK),
            P(_inr(e.amount),size=9, align=TA_RIGHT),
        ])
        total_shown_exp += float(e.amount)

    ctable = Table(charge_rows, colWidths=[W*0.75, W*0.25])
    ctable.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  BLUE),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LGRAY]),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ("LINEBELOW",     (0,0),(-1,-2), 0.3, BORDER),
        ("ROUNDEDCORNERS", [6,6,0,0]),
    ]))
    story.append(ctable)
    story.append(Spacer(1, 8))

    # Total amount row
    total_amt = freight + total_shown_exp
    total_row = Table([[
        P("TOTAL AMOUNT", font=FONTB, size=11, color=WHITE),
        P(_inr(total_amt), font=FONTB, size=11, color=WHITE, align=TA_RIGHT),
    ]], colWidths=[W*0.75, W*0.25])
    total_row.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), BLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 12),
        ("BOTTOMPADDING", (0,0),(-1,-1), 12),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ("ROUNDEDCORNERS", [0,0,6,6]),
    ]))
    story.append(total_row)

    # ── 5. NET PROFIT (optional — internal use) ────────────────────────────────
    if show_profit:
        all_exp = sum(float(e.amount) for e in (trip.expenses or []))
        profit  = freight - all_exp
        story.append(Spacer(1, 14))
        story.append(P("▌  NET PROFIT (INTERNAL)", font=FONTB, size=8, color=BLUE, spaceAfter=4))
        story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6))
        profit_row = Table([[
            P("Net Profit", font=FONTB, size=11, color=WHITE),
            P(_inr(profit),  font=FONTB, size=11, color=WHITE, align=TA_RIGHT),
        ]], colWidths=[W*0.75, W*0.25])
        profit_row.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), GREEN if profit >= 0 else RED),
            ("TOPPADDING",    (0,0),(-1,-1), 12),
            ("BOTTOMPADDING", (0,0),(-1,-1), 12),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("RIGHTPADDING",  (0,0),(-1,-1), 10),
            ("ROUNDEDCORNERS", [6,6,6,6]),
        ]))
        story.append(profit_row)

    # ── 6. NOTES ──────────────────────────────────────────────────────────────
    if trip.notes:
        story.append(Spacer(1, 14))
        story.append(P("▌  NOTES", font=FONTB, size=8, color=BLUE, spaceAfter=4))
        story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6))
        story.append(P(trip.notes, size=8.5))

    # ── 7. FOOTER ─────────────────────────────────────────────────────────────
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6))
    story.append(P(
        f"Generated by FleetSure · {date.today().strftime('%d %b %Y')} · This is a system-generated document.",
        size=7.5, color=GRAY, align=TA_CENTER
    ))

    doc.build(story)
    return buffer.getvalue()


@router.get("/{trip_id}/pdf")
def download_trip_pdf(
    trip_id: UUID,
    org_name: str = "",
    org_logo: str = "",          # base64 data URL
    expense_types: str = "all",  # "all" or comma-separated: "fuel,toll"
    show_profit: bool = False,   # include internal profit section
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = (
        db.query(Trip)
        .options(joinedload(Trip.vehicle), joinedload(Trip.expenses))
        .filter(Trip.id == trip_id, Trip.owner_id == current_user.id)
        .first()
    )
    if not trip:
        raise HTTPException(404, "Trip not found")

    include = ["all"] if expense_types == "all" else [t.strip() for t in expense_types.split(",")]

    pdf_bytes = build_trip_pdf(
        trip       = trip,
        org_name   = org_name,
        org_logo_b64 = org_logo,
        include_expense_types = include,
        show_profit = show_profit,
    )

    filename = f"tripsheet_{trip.origin}_{trip.destination}_{trip.start_date}.pdf".replace(" ", "_")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
