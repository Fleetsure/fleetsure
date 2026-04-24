"""
Export router — download fleet data as XLSX or CSV (ZIP).
Supports: vehicles, drivers, trips, expenses, fuel, profit_loss
"""
import csv
import io
import zipfile
from datetime import datetime, date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.expense import Expense, ExpenseType

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False

router = APIRouter(prefix="/export", tags=["export"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _safe(val):
    """Convert DB values to Excel-safe types."""
    if val is None:
        return ""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return str(val)
    return val


def _build_datasets(types: list[str], db: Session) -> dict:
    """Return dict of { sheet_name: (headers, rows) } for requested types."""
    result = {}

    if "vehicles" in types:
        rows = db.query(Vehicle).all()
        result["Vehicles"] = (
            ["Registration No", "Make", "Model", "Year", "Type", "Status", "Added On"],
            [[_safe(v.registration_number), _safe(v.make), _safe(v.model),
              _safe(v.year), _safe(v.vehicle_type), _safe(v.status),
              _safe(v.created_at)] for v in rows]
        )

    if "drivers" in types:
        rows = db.query(Driver).all()
        result["Drivers"] = (
            ["Name", "Phone", "Alt Phone", "License No", "License Class",
             "License Expiry", "Status"],
            [[_safe(d.name), _safe(d.phone), _safe(d.alternate_phone),
              _safe(d.license_number), _safe(d.license_class),
              _safe(d.license_expiry), _safe(d.status)] for d in rows]
        )

    if "trips" in types:
        rows = db.query(Trip).all()
        result["Trips"] = (
            ["From", "To", "Driver", "Driver Phone", "Start Date", "End Date",
             "Distance (km)", "Freight (₹)", "Status", "Notes"],
            [[_safe(t.origin), _safe(t.destination), _safe(t.driver_name),
              _safe(t.driver_phone), _safe(t.start_date), _safe(t.end_date),
              _safe(t.distance_km), _safe(t.freight_amount),
              _safe(t.status), _safe(t.notes)] for t in rows]
        )

    if "expenses" in types:
        rows = db.query(Expense).join(Trip).all()
        result["All Expenses"] = (
            ["Date", "Trip (From → To)", "Type", "Amount (₹)", "Description"],
            [[_safe(e.date),
              f"{_safe(e.trip.origin)} → {_safe(e.trip.destination)}" if e.trip else "",
              _safe(e.expense_type), _safe(e.amount), _safe(e.description)] for e in rows]
        )

    if "fuel" in types:
        rows = db.query(Expense).join(Trip).filter(
            Expense.expense_type == ExpenseType.FUEL
        ).all()
        result["Fuel Log"] = (
            ["Date", "Trip (From → To)", "Amount (₹)", "Description"],
            [[_safe(e.date),
              f"{_safe(e.trip.origin)} → {_safe(e.trip.destination)}" if e.trip else "",
              _safe(e.amount), _safe(e.description)] for e in rows]
        )

    if "profit_loss" in types:
        trips = db.query(Trip).all()
        pl_rows = []
        for t in trips:
            freight = float(t.freight_amount or 0)
            total_exp = sum(float(e.amount or 0) for e in t.expenses)
            profit = freight - total_exp
            margin = round((profit / freight * 100), 1) if freight else 0
            fuel_exp = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.FUEL)
            toll_exp = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.TOLL)
            maint_exp = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.MAINTENANCE)
            driver_exp = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.DRIVER_PAYMENT)
            pl_rows.append([
                _safe(t.start_date), _safe(t.origin), _safe(t.destination),
                _safe(t.driver_name), freight, total_exp, profit, f"{margin}%",
                fuel_exp, toll_exp, maint_exp, driver_exp, _safe(t.status)
            ])
        result["Profit & Loss"] = (
            ["Date", "From", "To", "Driver", "Freight (₹)", "Total Expenses (₹)",
             "Profit (₹)", "Margin", "Fuel (₹)", "Toll (₹)", "Maintenance (₹)",
             "Driver Pay (₹)", "Status"],
            pl_rows
        )

    return result


# ── XLSX export ───────────────────────────────────────────────────────────────

def _style_header_row(ws, header_row: int, col_count: int):
    header_fill = PatternFill("solid", fgColor="1E2D8E")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    for col in range(1, col_count + 1):
        cell = ws.cell(row=header_row, column=col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="left", vertical="center")


def _auto_width(ws):
    for col in ws.columns:
        max_len = max((len(str(cell.value or "")) for cell in col), default=10)
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 4, 40)


def export_xlsx(datasets: dict, org_name: str) -> StreamingResponse:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # remove default blank sheet

    # Summary sheet
    ws_sum = wb.create_sheet("Summary")
    ws_sum["A1"] = f"{org_name} — FleetSure Data Export"
    ws_sum["A1"].font = Font(bold=True, size=14, color="1E2D8E")
    ws_sum["A2"] = f"Generated: {datetime.now().strftime('%d %b %Y, %I:%M %p')}"
    ws_sum["A2"].font = Font(size=10, color="888888")
    ws_sum["A4"] = "Sheets in this workbook:"
    ws_sum["A4"].font = Font(bold=True)
    for i, sheet_name in enumerate(datasets.keys(), start=5):
        ws_sum[f"A{i}"] = f"  • {sheet_name}"
    _auto_width(ws_sum)

    for sheet_name, (headers, rows) in datasets.items():
        ws = wb.create_sheet(sheet_name)
        # Sheet title
        ws.append([sheet_name])
        ws["A1"].font = Font(bold=True, size=12, color="1E2D8E")
        ws.append([])  # blank row
        # Headers
        ws.append(headers)
        _style_header_row(ws, 3, len(headers))
        ws.row_dimensions[3].height = 22
        # Data rows
        alt_fill = PatternFill("solid", fgColor="F8F9FF")
        for r_idx, row in enumerate(rows):
            ws.append(row)
            if r_idx % 2 == 0:
                for col in range(1, len(headers) + 1):
                    ws.cell(row=4 + r_idx, column=col).fill = alt_fill
        # Freeze header
        ws.freeze_panes = "A4"
        _auto_width(ws)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    fname = f"fleetsure_export_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )


# ── CSV zip export ────────────────────────────────────────────────────────────

def export_csv_zip(datasets: dict) -> StreamingResponse:
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for sheet_name, (headers, rows) in datasets.items():
            csv_buf = io.StringIO()
            writer = csv.writer(csv_buf)
            writer.writerow(headers)
            writer.writerows(rows)
            safe_name = sheet_name.replace(" ", "_").replace("&", "and").lower()
            zf.writestr(f"{safe_name}.csv", csv_buf.getvalue())
    zip_buf.seek(0)

    fname = f"fleetsure_export_{datetime.now().strftime('%Y%m%d_%H%M')}.zip"
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/")
def export_data(
    format: str = Query("xlsx", description="xlsx or csv"),
    types: str = Query(
        "vehicles,drivers,trips,expenses,fuel,profit_loss",
        description="Comma-separated list of data types to include"
    ),
    org_name: str = Query("My Fleet", description="Organization name for export header"),
    db: Session = Depends(get_db)
):
    selected = [t.strip().lower() for t in types.split(",") if t.strip()]
    if not selected:
        selected = ["vehicles", "drivers", "trips", "expenses", "fuel", "profit_loss"]

    datasets = _build_datasets(selected, db)

    if not datasets:
        return {"error": "No data found for selected types"}

    if format == "csv":
        return export_csv_zip(datasets)

    if not XLSX_AVAILABLE:
        return {"error": "openpyxl not installed. Run: pip install openpyxl"}

    return export_xlsx(datasets, org_name)
