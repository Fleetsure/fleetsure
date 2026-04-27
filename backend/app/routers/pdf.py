from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import io
from datetime import date

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.database import get_db
from app.models.trip import Trip
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/trips", tags=["PDF"])

BRAND_BLUE  = colors.HexColor("#1E2D8E")
BRAND_LIGHT = colors.HexColor("#e8eaf6")
GRAY        = colors.HexColor("#888888")
DARK        = colors.HexColor("#1a1a2e")
RED         = colors.HexColor("#c62828")
GREEN       = colors.HexColor("#2e7d32")
WHITE       = colors.white


def _fmt_date(d) -> str:
    if not d:
        return "—"
    if isinstance(d, str):
        return d
    return d.strftime("%d %b %Y")

def _fmt_inr(amount) -> str:
    if amount is None:
        return "—"
    return f"₹{float(amount):,.0f}"


def build_trip_pdf(trip: Trip, org_name: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=14*mm, bottomMargin=14*mm,
    )

    W = A4[0] - 36*mm  # usable width
    styles = getSampleStyleSheet()

    # Custom styles
    def style(name, **kw):
        s = ParagraphStyle(name, **kw)
        return s

    S = {
        "brand":   style("brand",   fontSize=22, fontName="Helvetica-Bold", textColor=WHITE),
        "sub":     style("sub",     fontSize=9,  fontName="Helvetica",      textColor=colors.HexColor("#c5cae9")),
        "title":   style("title",   fontSize=11, fontName="Helvetica-Bold", textColor=WHITE,     alignment=TA_RIGHT),
        "docnum":  style("docnum",  fontSize=9,  fontName="Helvetica",      textColor=colors.HexColor("#c5cae9"), alignment=TA_RIGHT),
        "section": style("section", fontSize=9,  fontName="Helvetica-Bold", textColor=BRAND_BLUE, spaceAfter=2),
        "label":   style("label",   fontSize=8,  fontName="Helvetica",      textColor=GRAY),
        "value":   style("value",   fontSize=9,  fontName="Helvetica-Bold", textColor=DARK),
        "small":   style("small",   fontSize=8,  fontName="Helvetica",      textColor=GRAY),
        "footer":  style("footer",  fontSize=7.5,fontName="Helvetica",      textColor=GRAY, alignment=TA_CENTER),
        "total_l": style("total_l", fontSize=10, fontName="Helvetica-Bold", textColor=WHITE),
        "total_r": style("total_r", fontSize=10, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_RIGHT),
    }

    story = []

    # ── Header banner ──────────────────────────────────────────────────────────
    header_left = [
        [Paragraph("FleetSure", S["brand"])],
        [Paragraph(org_name or "Fleet Management", S["sub"])],
    ]
    header_right = [
        [Paragraph("TRIP SHEET", S["title"])],
        [Paragraph(
            f"Doc No: {trip.doc_number or '—'}<br/>Date: {_fmt_date(trip.start_date)}",
            S["docnum"]
        )],
    ]
    header_table = Table(
        [[
            Table(header_left, colWidths=[W * 0.55]),
            Table(header_right, colWidths=[W * 0.45]),
        ]],
        colWidths=[W * 0.55, W * 0.45],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BRAND_BLUE),
        ("VALIGN",     (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",(0,0), (-1,-1), 12),
        ("RIGHTPADDING",(0,0),(-1,-1), 12),
        ("TOPPADDING", (0,0), (-1,-1), 12),
        ("BOTTOMPADDING",(0,0),(-1,-1), 12),
        ("ROUNDEDCORNERS", [6,6,6,6]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # ── Route banner ───────────────────────────────────────────────────────────
    route_data = [[
        Paragraph(trip.origin.upper(), style("orig", fontSize=13, fontName="Helvetica-Bold", textColor=BRAND_BLUE)),
        Paragraph("→", style("arr",  fontSize=16, fontName="Helvetica-Bold", textColor=GRAY, alignment=TA_CENTER)),
        Paragraph(trip.destination.upper(), style("dest", fontSize=13, fontName="Helvetica-Bold", textColor=BRAND_BLUE, alignment=TA_RIGHT)),
    ]]
    route_table = Table(route_data, colWidths=[W*0.44, W*0.12, W*0.44])
    route_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BRAND_LIGHT),
        ("VALIGN",     (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("LEFTPADDING",(0,0),(0,-1), 14),
        ("RIGHTPADDING",(-1,0),(-1,-1), 14),
        ("ROUNDEDCORNERS", [6,6,6,6]),
    ]))
    story.append(route_table)
    story.append(Spacer(1, 12))

    # ── Trip Details grid ──────────────────────────────────────────────────────
    v = trip.vehicle
    def cell(label, val):
        return [Paragraph(label, S["label"]), Paragraph(str(val) if val else "—", S["value"])]

    details = [
        cell("Vehicle",     f"{v.registration_number} — {v.make} {v.model}" if v else "—"),
        cell("Driver",      trip.driver_name),
        cell("Driver Phone",trip.driver_phone or "—"),
        cell("Start Date",  _fmt_date(trip.start_date)),
        cell("End Date",    _fmt_date(trip.end_date)),
        cell("Distance",    f"{trip.distance_km} km" if trip.distance_km else "—"),
        cell("Material",    trip.material or "—"),
        cell("Weight",      f"{trip.weight_tonnes} T" if trip.weight_tonnes else "—"),
    ]

    # 2-column layout
    rows = []
    for i in range(0, len(details), 2):
        left  = details[i]
        right = details[i+1] if i+1 < len(details) else ["", ""]
        rows.append([left[0], left[1], Paragraph("", S["label"]), right[0], right[1]])

    detail_table = Table(rows, colWidths=[W*0.18, W*0.30, W*0.04, W*0.18, W*0.30])
    detail_table.setStyle(TableStyle([
        ("VALIGN",      (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",  (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING",(0,0), (-1,-1), 4),
    ]))
    story.append(Paragraph("TRIP DETAILS", S["section"]))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_LIGHT, spaceAfter=6))
    story.append(detail_table)
    story.append(Spacer(1, 12))

    # ── Expenses table ─────────────────────────────────────────────────────────
    story.append(Paragraph("EXPENSES", S["section"]))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_LIGHT, spaceAfter=6))

    if trip.expenses:
        exp_rows = [[
            Paragraph("Date",        style("eh", fontSize=8, fontName="Helvetica-Bold", textColor=WHITE)),
            Paragraph("Type",        style("eh", fontSize=8, fontName="Helvetica-Bold", textColor=WHITE)),
            Paragraph("Description", style("eh", fontSize=8, fontName="Helvetica-Bold", textColor=WHITE)),
            Paragraph("Amount",      style("eh", fontSize=8, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_RIGHT)),
        ]]
        total_exp = 0
        for e in sorted(trip.expenses, key=lambda x: x.date):
            exp_rows.append([
                Paragraph(_fmt_date(e.date),                  style("ed", fontSize=8, fontName="Helvetica", textColor=DARK)),
                Paragraph(e.expense_type.replace("_"," ").title(), style("ed", fontSize=8, fontName="Helvetica", textColor=DARK)),
                Paragraph(e.description or "—",               style("ed", fontSize=8, fontName="Helvetica", textColor=DARK)),
                Paragraph(_fmt_inr(e.amount),                 style("ed", fontSize=8, fontName="Helvetica", textColor=DARK, alignment=TA_RIGHT)),
            ])
            total_exp += float(e.amount)

        exp_table = Table(exp_rows, colWidths=[W*0.15, W*0.20, W*0.45, W*0.20])
        exp_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0),  BRAND_BLUE),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, BRAND_LIGHT]),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("RIGHTPADDING",  (0,0), (-1,-1), 6),
            ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#e0e0e0")),
            ("ROUNDEDCORNERS",[4,4,4,4]),
        ]))
        story.append(exp_table)
    else:
        story.append(Paragraph("No expenses recorded for this trip.", S["small"]))
        total_exp = 0

    story.append(Spacer(1, 14))

    # ── Financial summary ──────────────────────────────────────────────────────
    story.append(Paragraph("FINANCIAL SUMMARY", S["section"]))
    story.append(HRFlowable(width=W, thickness=1, color=BRAND_LIGHT, spaceAfter=6))

    freight   = float(trip.freight_amount or 0)
    advance   = float(trip.driver_advance or 0)
    profit    = freight - total_exp

    fin_rows = [
        ["Freight Amount",  _fmt_inr(freight)],
        ["Total Expenses",  _fmt_inr(total_exp)],
        ["Driver Advance",  _fmt_inr(advance)],
    ]
    fin_table = Table(fin_rows, colWidths=[W*0.65, W*0.35])
    fin_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("TEXTCOLOR",     (0,0), (0,-1),  GRAY),
        ("TEXTCOLOR",     (1,0), (1,-1),  DARK),
        ("ALIGN",         (1,0), (1,-1),  "RIGHT"),
        ("FONTNAME",      (1,0), (1,-1),  "Helvetica-Bold"),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LINEBELOW",     (0,-1),(-1,-1), 0.5, colors.HexColor("#e0e0e0")),
    ]))
    story.append(fin_table)
    story.append(Spacer(1, 6))

    # Net profit row
    profit_color = GREEN if profit >= 0 else RED
    profit_data = [[
        Paragraph("NET PROFIT", style("pl", fontSize=11, fontName="Helvetica-Bold", textColor=WHITE)),
        Paragraph(_fmt_inr(profit), style("pr", fontSize=11, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_RIGHT)),
    ]]
    profit_table = Table(profit_data, colWidths=[W*0.65, W*0.35])
    profit_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), profit_color),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("ROUNDEDCORNERS",[4,4,4,4]),
    ]))
    story.append(profit_table)
    story.append(Spacer(1, 20))

    # ── Notes ──────────────────────────────────────────────────────────────────
    if trip.notes:
        story.append(Paragraph("NOTES", S["section"]))
        story.append(HRFlowable(width=W, thickness=1, color=BRAND_LIGHT, spaceAfter=6))
        story.append(Paragraph(trip.notes, style("notes", fontSize=8.5, fontName="Helvetica", textColor=DARK)))
        story.append(Spacer(1, 14))

    # ── Footer ─────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width=W, thickness=0.5, color=BRAND_LIGHT, spaceAfter=6))
    story.append(Paragraph(
        f"Generated by FleetSure · {date.today().strftime('%d %b %Y')} · This is a system-generated document.",
        S["footer"]
    ))

    doc.build(story)
    return buffer.getvalue()


@router.get("/{trip_id}/pdf")
def download_trip_pdf(
    trip_id: UUID,
    org_name: str = "",
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

    pdf_bytes = build_trip_pdf(trip, org_name)
    filename = f"tripsheet_{trip.origin.lower()}_{trip.destination.lower()}_{trip.start_date}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
