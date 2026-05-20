from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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

from app.db import supabase
from app.services.auth_service import get_current_user

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


def build_trip_pdf(trip: dict, expenses: list, vehicle: dict, org_name: str, org_logo_b64: str,
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

    org_display = org_name or "Fleet Company"

    right_para = Paragraph(
        f'<font name="{FONTB}" size="12" color="white">TRIP SHEET</font><br/>'
        f'<font name="{FONT}" size="8" color="#c5cae9">Doc: {trip.get("doc_number") or "—"}</font><br/>'
        f'<font name="{FONT}" size="8" color="#c5cae9">Date: {_fmt_date(trip.get("start_date"))}</font>',
        ParagraphStyle("rp", alignment=TA_RIGHT, leading=14)
    )

    logo_img = None
    if org_logo_b64:
        try:
            img_data = base64.b64decode(org_logo_b64.split(",")[-1])
            logo_img = RLImage(io.BytesIO(img_data), width=36, height=36)
        except Exception:
            pass

    if logo_img:
        left_cell = Table(
            [[logo_img,
              Paragraph(
                f'<font name="{FONTB}" size="13" color="white">{org_display}</font><br/>'
                f'<font name="{FONT}" size="8" color="#c5cae9">Transport &amp; Logistics</font>',
                ParagraphStyle("lp", leading=16)
              )
            ]],
            colWidths=[42, W*0.46]
        )
        left_cell.setStyle(TableStyle([
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("LEFTPADDING",   (0,0),(-1,-1), 0),
            ("RIGHTPADDING",  (0,0),(-1,-1), 4),
            ("TOPPADDING",    (0,0),(-1,-1), 0),
            ("BOTTOMPADDING", (0,0),(-1,-1), 0),
        ]))
        left_content = left_cell
    else:
        left_content = Paragraph(
            f'<font name="{FONTB}" size="15" color="white">{org_display}</font><br/>'
            f'<font name="{FONT}" size="8" color="#c5cae9">Transport &amp; Logistics</font>',
            ParagraphStyle("lp2", leading=18)
        )

    banner = Table([[left_content, right_para]], colWidths=[W*0.60, W*0.40])
    banner.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), BLUE),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(0,-1),  14),
        ("RIGHTPADDING",  (0,0),(0,-1),  6),
        ("LEFTPADDING",   (1,0),(1,-1),  6),
        ("RIGHTPADDING",  (1,0),(1,-1),  14),
        ("TOPPADDING",    (0,0),(-1,-1), 14),
        ("BOTTOMPADDING", (0,0),(-1,-1), 14),
        ("ROUNDEDCORNERS", [8,8,8,8]),
    ]))
    story.append(banner)
    accent = Table([[""]], colWidths=[W])
    accent.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), GOLD),
        ("TOPPADDING",    (0,0),(-1,-1), 2),
        ("BOTTOMPADDING", (0,0),(-1,-1), 2),
    ]))
    story.append(accent)
    story.append(Spacer(1, 6))

    route = Table([[
        P((trip.get("origin") or "").upper(),      font=FONTB, size=14, color=BLUE),
        P("→", size=16, color=GRAY, align=TA_CENTER),
        P((trip.get("destination") or "").upper(), font=FONTB, size=14, color=BLUE, align=TA_RIGHT),
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

    def lv(label, val):
        return [P(label, size=8, color=GRAY), P(val or "—", font=FONTB, size=9)]

    reg = vehicle.get("registration_number") if vehicle else "—"
    veh_label = f"{vehicle.get('make', '')} {vehicle.get('model', '')}".strip() if vehicle else "—"

    details = [
        lv("Vehicle No.",   reg),
        lv("Vehicle",       veh_label),
        lv("Driver Name",   trip.get("driver_name")),
        lv("Driver Phone",  trip.get("driver_phone")),
        lv("Start Date",    _fmt_date(trip.get("start_date"))),
        lv("End Date",      _fmt_date(trip.get("end_date"))),
        lv("Distance",      f"{trip.get('distance_km')} km" if trip.get("distance_km") else None),
        lv("Material",      trip.get("material")),
        lv("Weight",        f"{trip.get('weight_tonnes')} Tonnes" if trip.get("weight_tonnes") else None),
        lv("Doc Number",    trip.get("doc_number")),
    ]
    details = [d for d in details if d[1].text != "—"]

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

    story.append(P("▌  CHARGES", font=FONTB, size=8, color=BLUE, spaceAfter=4))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6))

    freight = float(trip.get("freight_amount") or 0)
    total_shown_exp = 0.0

    charge_rows = [[
        P("Description", font=FONTB, size=8, color=WHITE),
        P("Amount",      font=FONTB, size=8, color=WHITE, align=TA_RIGHT),
    ]]
    charge_rows.append([
        P("Freight Charge", font=FONTB, size=9),
        P(_inr(freight),    font=FONTB, size=9, align=TA_RIGHT),
    ])

    shown_exps = [e for e in expenses
                  if "all" in include_expense_types or e.get("expense_type") in include_expense_types]
    shown_exps.sort(key=lambda e: e.get("date") or "")

    for e in shown_exps:
        label = (e.get("expense_type") or "").replace("_", " ").title()
        if e.get("description"):
            label += f" — {e['description']}"
        charge_rows.append([
            P(label,          size=9, color=DARK),
            P(_inr(e.get("amount")), size=9, align=TA_RIGHT),
        ])
        total_shown_exp += float(e.get("amount") or 0)

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

    if show_profit:
        all_exp = sum(float(e.get("amount") or 0) for e in expenses)
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

    if trip.get("notes"):
        story.append(Spacer(1, 14))
        story.append(P("▌  NOTES", font=FONTB, size=8, color=BLUE, spaceAfter=4))
        story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6))
        story.append(P(trip["notes"], size=8.5))

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
    expense_types: str = "all",
    show_profit: bool = False,
    current_user: dict = Depends(get_current_user),
):
    trip_res = supabase.table("trips").select("*").eq("id", str(trip_id)).eq("owner_id", current_user["id"]).execute().data
    if not trip_res:
        raise HTTPException(404, "Trip not found")
    trip = trip_res[0]

    expenses = supabase.table("expenses").select("*").eq("trip_id", str(trip_id)).execute().data

    vehicle = None
    if trip.get("vehicle_id"):
        veh_res = supabase.table("vehicles").select("*").eq("id", trip["vehicle_id"]).execute().data
        vehicle = veh_res[0] if veh_res else None

    include = ["all"] if expense_types == "all" else [t.strip() for t in expense_types.split(",")]

    pdf_bytes = build_trip_pdf(
        trip=trip,
        expenses=expenses,
        vehicle=vehicle,
        org_name=current_user.get("org_name") or "",
        org_logo_b64=current_user.get("org_logo") or "",
        include_expense_types=include,
        show_profit=show_profit,
    )

    filename = f"tripsheet_{trip.get('origin')}_{trip.get('destination')}_{trip.get('start_date')}.pdf".replace(" ", "_")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
