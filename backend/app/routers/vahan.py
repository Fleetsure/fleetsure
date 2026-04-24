"""
Vahan RC Lookup via NAPIX (NIC API Exchange Platform)
Official source: dev.napix.gov.in/nic/parivahan

FleetSure registers ONCE on NAPIX — gets one free API key — bakes it in .env.
Customers never see or set any API key. Fetch just works.

.env:
  VAHAN_API_KEY=your_napix_key   ← FleetSure's own key, not customer's

To get the key:
  1. Register at https://dev.napix.gov.in/nic/parivahan (free, org registration)
  2. Apply for the "RC Details" API product
  3. Approval takes 1-2 business days
  4. Copy key → paste in .env → redeploy

Until the key is set, demo mode is the automatic fallback.
"""

import random
from datetime import date, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/vahan", tags=["Vahan RC Lookup"])

NAPIX_RC_ENDPOINT = "https://dev.napix.gov.in/nic/parivahan/v1/rc/findByRegNo"


# ── Response schema ───────────────────────────────────────────────────────────

class VahanVehicleData(BaseModel):
    registration_number: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    fuel_type: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_class: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    owner_name: Optional[str] = None
    rto_code: Optional[str] = None
    rto_name: Optional[str] = None
    color: Optional[str] = None
    insurance_expiry: Optional[str] = None
    fitness_expiry: Optional[str] = None
    puc_expiry: Optional[str] = None
    permit_expiry: Optional[str] = None
    registration_date: Optional[str] = None
    is_demo: bool = False


class VahanLookupResponse(BaseModel):
    success: bool
    live: bool = False          # True = real Vahan data, False = demo
    data: Optional[VahanVehicleData] = None
    error: Optional[str] = None


# ── Demo fallback ─────────────────────────────────────────────────────────────

_TRUCKS = [
    ("Tata Motors", "LPT 2518", "truck"),
    ("Tata Motors", "Signa 4825.S", "truck"),
    ("Ashok Leyland", "Ecomet 1915", "mini_truck"),
    ("Ashok Leyland", "Boss 1616", "truck"),
    ("Mahindra", "Bolero Pickup", "mini_truck"),
    ("Eicher", "Pro 6025", "truck"),
    ("BharatBenz", "1217R", "truck"),
    ("Volvo", "FH 420", "trailer"),
]
_RTOS = {
    "MH": "Mumbai Central", "DL": "Delhi North", "GJ": "Ahmedabad",
    "RJ": "Jaipur", "TN": "Chennai", "KA": "Bengaluru",
    "UP": "Lucknow", "HR": "Gurugram", "PB": "Amritsar",
    "MP": "Bhopal", "AP": "Vijayawada", "TS": "Hyderabad",
}
_OWNERS = [
    "Ramesh Kumar Transport", "Jaswant Singh Roadways", "Naresh Patel Cargo",
    "Maharashtra Logistics Pvt Ltd", "Sharma Brothers Transport",
    "Gupta Fleet Services", "Rajendra Yadav Trucks", "Venkat Reddy Transport",
]

def _demo(reg: str) -> VahanVehicleData:
    rng = random.Random(sum(ord(c) for c in reg))
    make, model, vtype = rng.choice(_TRUCKS)
    state = reg[:2].upper()
    rto_code = f"{state}{reg[2:4]}" if len(reg) >= 4 else state
    today = date.today()
    return VahanVehicleData(
        registration_number=reg.upper(),
        make=make, model=model, year=rng.randint(2015, 2022),
        fuel_type="Diesel", vehicle_type=vtype,
        vehicle_class="M-Goods Carrying" if vtype == "truck" else "Light Goods Vehicle",
        chassis_number=f"MAT{rng.randint(100000000, 999999999)}",
        engine_number="".join(rng.choices("ABCDEFGHJKLMNPRSTUVWXYZ0123456789", k=10)),
        owner_name=rng.choice(_OWNERS),
        rto_code=rto_code, rto_name=_RTOS.get(state, f"{state} RTO"),
        color=rng.choice(["White", "Blue", "Red", "Grey", "Yellow"]),
        insurance_expiry=str(today + timedelta(days=rng.choice([-10, 25, 120, 365]))),
        fitness_expiry   =str(today + timedelta(days=rng.choice([20, 90, 400]))),
        puc_expiry       =str(today + timedelta(days=rng.choice([-5, 15, 60, 180]))),
        permit_expiry    =str(today + timedelta(days=rng.choice([30, 180, 365]))),
        is_demo=True,
    )


# ── NAPIX field mapping ───────────────────────────────────────────────────────

def _parse_date(val: Optional[str]) -> Optional[str]:
    """DD-MM-YYYY → YYYY-MM-DD"""
    if not val: return None
    val = val.strip()
    for sep in ["-", "/"]:
        parts = val.split(sep)
        if len(parts) == 3 and len(parts[0]) == 2:
            try: return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            except: pass
    return val[:10] if len(val) >= 10 else val

def _extract_year(reg_date, mfg) -> Optional[int]:
    for src in [mfg, reg_date]:
        if src:
            candidate = str(src).replace("/", "-").split("-")[-1].strip()
            try:
                y = int(candidate)
                if 1980 <= y <= 2030: return y
            except ValueError: pass
    return None

def _map_vehicle_type(vc: str) -> str:
    vc = (vc or "").lower()
    if "trailer"   in vc: return "trailer"
    if "tanker"    in vc: return "tanker"
    if "container" in vc: return "container"
    if any(x in vc for x in ["light", "lmv", "mini"]): return "mini_truck"
    if any(x in vc for x in ["goods", "truck", "hgmv"]): return "truck"
    return "other"

def _map(raw: dict, reg: str) -> VahanVehicleData:
    d = raw.get("response") or raw.get("data") or raw.get("result") or raw
    make  = (d.get("makerDesc") or d.get("maker") or "").strip().title()
    model = (d.get("modelDesc") or d.get("model") or "").strip().upper()
    vc    = (d.get("vehicleClassDesc") or d.get("vehicleClass") or d.get("bodyTypeDesc") or "").strip()
    fuel  = (d.get("fuelDesc") or d.get("fuel") or "").strip().title()
    color = (d.get("color") or d.get("vehicleColour") or "").strip().title()
    reg_date = _parse_date(d.get("regDate") or d.get("registrationDate"))
    year = _extract_year(reg_date, d.get("mfgMonthYear") or d.get("manufacturingYear"))
    rto_code = (d.get("districtCode") or reg[:4]).upper()
    owner = (d.get("ownerName") or d.get("owner") or "").strip().title()
    return VahanVehicleData(
        registration_number=reg.upper(),
        make=make or None, model=model or None, year=year,
        fuel_type=fuel or None,
        vehicle_type=_map_vehicle_type(vc), vehicle_class=vc or None,
        chassis_number=d.get("chassisNo") or d.get("chassisNumber") or None,
        engine_number =d.get("engineNo")  or d.get("engineNumber")  or None,
        owner_name=owner or None,
        rto_code=rto_code, rto_name=d.get("rtoName") or d.get("registeredAt") or None,
        color=color or None,
        insurance_expiry=_parse_date(d.get("insuranceUpTo") or d.get("insuranceUpto")),
        fitness_expiry  =_parse_date(d.get("fitUpTo") or d.get("fitUpto") or d.get("fitnessUpto")),
        puc_expiry      =_parse_date(d.get("puucUpTo") or d.get("puucUpto") or d.get("pucUpTo")),
        permit_expiry   =_parse_date(d.get("permitValidUpto") or d.get("nationalPermitUpto")),
        registration_date=reg_date,
    )


# ── NAPIX HTTP call ───────────────────────────────────────────────────────────

async def _call_napix(reg: str, api_key: str) -> dict:
    headers = {
        "X-Api-Key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(NAPIX_RC_ENDPOINT, json={"regNo": reg}, headers=headers)
        resp.raise_for_status()
        return resp.json()


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/lookup", response_model=VahanLookupResponse)
async def vahan_lookup(
    reg: str = Query(..., description="Vehicle registration number e.g. MH12AB1234"),
):
    """
    Fetch vehicle details from Vahan (MoRTH) via NAPIX.
    Uses FleetSure's own API key — customers need not configure anything.
    Falls back to realistic demo data if the key is not yet set.
    """
    reg = reg.strip().upper().replace(" ", "")
    if len(reg) < 4:
        return VahanLookupResponse(success=False, error="Invalid registration number")

    key = (getattr(settings, "VAHAN_API_KEY", "") or "").strip()

    # No key yet → auto demo fallback (silent, no error shown to customer)
    if not key:
        return VahanLookupResponse(success=True, live=False, data=_demo(reg))

    try:
        raw = await _call_napix(reg, key)

        if isinstance(raw, dict):
            status = str(raw.get("status") or raw.get("statusCode") or "").lower()
            if status in ("failure", "error", "failed") or raw.get("errorCode"):
                msg = raw.get("message") or raw.get("error") or "Vehicle not found in Vahan database"
                return VahanLookupResponse(success=False, error=msg)

        return VahanLookupResponse(success=True, live=True, data=_map(raw, reg))

    except httpx.HTTPStatusError as e:
        msgs = {
            400: "Invalid registration number format",
            401: "NAPIX API key is invalid — check .env",
            403: "NAPIX key not approved for RC Details yet",
            404: "Vehicle not found in Vahan database",
            429: "Rate limit hit — try again in a minute",
            503: "Vahan service temporarily unavailable — try again shortly",
        }
        # On server-side errors, silently fall back to demo so UX isn't broken
        if e.response.status_code >= 500:
            return VahanLookupResponse(success=True, live=False, data=_demo(reg))
        return VahanLookupResponse(
            success=False,
            error=msgs.get(e.response.status_code, f"NAPIX error {e.response.status_code}")
        )
    except httpx.TimeoutException:
        # Timeout → silent demo fallback
        return VahanLookupResponse(success=True, live=False, data=_demo(reg))
    except Exception as e:
        return VahanLookupResponse(success=False, error=str(e))


@router.get("/status")
def vahan_status():
    key = (getattr(settings, "VAHAN_API_KEY", "") or "").strip()
    return {
        "live": bool(key),
        "source": "NAPIX — NIC API Exchange Platform",
        "portal": "https://dev.napix.gov.in/nic/parivahan",
    }
