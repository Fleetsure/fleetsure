"""
Export router — download fleet data as XLSX or CSV (ZIP).
Supports: vehicles, drivers, trips, fuel, tolls, tyres, misc, profit_loss
All data is filtered by the authenticated user's owner_id.
"""
import csv
import io
import zipfile
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.expense import Expense, ExpenseType
from app.models.fuel_log import FuelLog
from app.models.toll_log import TollLog
from app.models.tyre_log import TyreLog
from app.models.misc_expense import MiscExpense
from app.models.user import User
from app.services.auth_service import get_current_user

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False

router = APIRouter(prefix="/export", tags=["export"])


def _safe(val):
    if val is None:
        return ""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return str(val)
    return val


def _build_datasets(types: list[str], db: Session, owner_id: UUID) -> dict:
    result = {}

    if "vehicles" in types:
        rows = db.query(Vehicle).filter(Vehicle.owner_id == owner_id).all()
        result["Vehicles"] = (
            ["Registration No", "Make", "Model", "Year", "Type", "Fuel Type", "Status",
             "Insurance Expiry", "Fitness Expiry", "PUC Expiry", "Permit Expiry"],
            [[_safe(v.registration_number), _safe(v.make), _safe(v.model), _safe(v.year),
              _safe(v.vehicle_type), _safe(v.fuel_type), _safe(v.status),
              _safe(v.insurance_expiry), _safe(v.fitness_expiry),
              _safe(v.puc_expiry), _safe(v.permit_expiry)] for v in rows]
        )

    if "drivers" in types:
        rows = db.query(Driver).filter(Driver.owner_id == owner_id).all()
        result["Drivers"] = (
            ["Name", "Phone", "Alt Phone", "License No", "License Class", "License Expiry",
             "Transport Valid Till", "Blood Group", "Status"],
            [[_safe(d.name), _safe(d.phone), _safe(d.alternate_phone),
              _safe(d.license_number), _safe(d.license_class), _safe(d.license_expiry),
              _safe(d.transport_validity), _safe(d.blood_group), _safe(d.status)] for d in rows]
        )

    if "trips" in types:
        rows = db.query(Trip).filter(Trip.owner_id == owner_id).order_by(Trip.start_date.desc()).all()
        result["Trips"] = (
            ["Date", "From", "To", "Driver", "Driver Phone", "Vehicle",
             "Distance (km)", "Freight (₹)", "Status", "Notes"],
            [[_safe(t.start_date), _safe(t.origin), _safe(t.destination),
              _safe(t.driver_name), _safe(t.driver_phone), _safe(t.vehicle_id),
              _safe(t.distance_km), _safe(t.freight_amount),
              _safe(t.status), _safe(t.notes)] for t in rows]
        )

    if "fuel" in types:
        rows = db.query(FuelLog).filter(FuelLog.owner_id == owner_id).order_by(FuelLog.date.desc()).all()
        # Map vehicle_id → reg number
        veh_map = {v.id: v.registration_number for v in db.query(Vehicle).filter(Vehicle.owner_id == owner_id).all()}
        result["Fuel Log"] = (
            ["Date", "Vehicle", "Litres", "Amount (₹)", "Odometer (km)", "Fuel Station", "Notes"],
            [[_safe(f.date), veh_map.get(f.vehicle_id, ""), _safe(f.litres),
              _safe(f.amount), _safe(f.odometer_km), _safe(f.fuel_station), _safe(f.notes)] for f in rows]
        )

    if "tolls" in types:
        rows = db.query(TollLog).filter(TollLog.owner_id == owner_id).order_by(TollLog.date.desc()).all()
        veh_map = {v.id: v.registration_number for v in db.query(Vehicle).filter(Vehicle.owner_id == owner_id).all()}
        result["Tolls"] = (
            ["Date", "Vehicle", "Toll Plaza", "Route", "Payment Mode", "Amount (₹)", "Notes"],
            [[_safe(t.date), veh_map.get(t.vehicle_id, ""), _safe(t.toll_plaza),
              _safe(t.route), _safe(t.payment_mode), _safe(t.amount), _safe(t.notes)] for t in rows]
        )

    if "tyres" in types:
        rows = db.query(TyreLog).filter(TyreLog.owner_id == owner_id).order_by(TyreLog.date.desc()).all()
        veh_map = {v.id: v.registration_number for v in db.query(Vehicle).filter(Vehicle.owner_id == owner_id).all()}
        result["Tyres"] = (
            ["Date", "Vehicle", "Type", "Brand", "Count", "Position", "Odometer (km)", "Amount (₹)", "Notes"],
            [[_safe(t.date), veh_map.get(t.vehicle_id, ""), _safe(t.tyre_type),
              _safe(t.tyre_brand), _safe(t.tyre_count), _safe(t.tyre_position),
              _safe(t.odometer_km), _safe(t.amount), _safe(t.notes)] for t in rows]
        )

    if "misc" in types:
        rows = db.query(MiscExpense).filter(MiscExpense.owner_id == owner_id).order_by(MiscExpense.date.desc()).all()
        veh_map = {v.id: v.registration_number for v in db.query(Vehicle).filter(Vehicle.owner_id == owner_id).all()}
        result["Misc Expenses"] = (
            ["Date", "Vehicle", "Category", "Description", "Amount (₹)", "Notes"],
            [[_safe(m.date), veh_map.get(m.vehicle_id, "") if m.vehicle_id else "",
              _safe(m.category), _safe(m.description), _safe(m.amount), _safe(m.notes)] for m in rows]
        )

    if "profit_loss" in types:
        trips = db.query(Trip).filter(Trip.owner_id == owner_id).order_by(Trip.start_date.desc()).all()
        veh_map = {v.id: v.registration_number for v in db.query(Vehicle).filter(Vehicle.owner_id == owner_id).all()}
        pl_rows = []
        for t in trips:
            freight   = float(t.freight_amount or 0)
            total_exp = sum(float(e.amount or 0) for e in t.expenses)
            profit    = freight - total_exp
            margin    = round((profit / freight * 100), 1) if freight else 0
            fuel_exp  = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.FUEL)
            toll_exp  = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.TOLL)
            maint_exp = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.MAINTENANCE)
            drv_exp   = sum(float(e.amount or 0) for e in t.expenses if e.expense_type == ExpenseType.DRIVER_PAYMENT)
            pl_rows.append([
                _safe(t.start_date), _safe(t.origin), _safe(t.destination),
                veh_map.get(t.vehicle_id, ""), _safe(t.driver_name),
                freight, total_exp, profit, f"{margin}%",
                fuel_exp, toll_exp, maint_exp, drv_exp, _safe(t.status)
            ])
        result["Profit & Loss"] = (
            ["Date", "From", "To", "Vehicle", "Driver", "Freight (₹)", "Total Expenses (₹)",
             "Profit (₹)", "Margin", "Fuel (₹)", "Toll (₹)", "Maintenance (₹)",
             "Driver Pay (₹)", "Status"],
            pl_rows
        )

    return result


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
    wb.remove(wb.active)

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
        ws.append([sheet_name])
        ws["A1"].font = Font(bold=True, size=12, color="1E2D8E")
        ws.append([])
        ws.append(headers)
        _style_header_row(ws, 3, len(headers))
        ws.row_dimensions[3].height = 22
        alt_fill = PatternFill("solid", fgColor="F8F9FF")
        for r_idx, row in enumerate(rows):
            ws.append(row)
            if r_idx % 2 == 0:
                for col in range(1, len(headers) + 1):
                    ws.cell(row=4 + r_idx, column=col).fill = alt_fill
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


@router.get("/")
def export_data(
    format: str = Query("xlsx"),
    types: str = Query("vehicles,drivers,trips,fuel,tolls,tyres,misc,profit_loss"),
    org_name: str = Query("My Fleet"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    selected = [t.strip().lower() for t in types.split(",") if t.strip()]
    datasets = _build_datasets(selected, db, current_user.id)

    if not datasets:
        return {"error": "No data found"}

    if format == "csv":
        return export_csv_zip(datasets)

    if not XLSX_AVAILABLE:
        return {"error": "openpyxl not installed on server"}

    return export_xlsx(datasets, org_name)
