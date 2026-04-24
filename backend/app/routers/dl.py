"""
Parivahan DL (Driving Licence) Lookup via NAPIX
Official source: dev.napix.gov.in/nic/parivahan

Same key as Vahan RC — FleetSure's single NAPIX key covers both RC and DL APIs.
Customers need not configure anything.

Endpoint: POST /nic/parivahan/v1/dl/findByDlNo
Body: {"dlNo": "MH1220210012345", "dob": "1990-05-15"}
"""

import random
from datetime import date, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/dl", tags=["DL Lookup"])

NAPIX_DL_ENDPOINT = "https://dev.napix.gov.in/nic/parivahan/v1/dl/findByDlNo"


# ── Response schema ───────────────────────────────────────────────────────────

class DLData(BaseModel):
    dl_number: str
    name: Optional[str] = None
    father_name: Optional[str] = None
    dob: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    license_class: Optional[str] = None       # e.g. "HGMV", "LMV,HGMV"
    license_expiry: Optional[str] = None      # non-transport validity
    transport_validity: Optional[str] = None  # transport endorsement expiry
    badge_issue_date: Optional[str] = None
    issuing_rto: Optional[str] = None
    is_demo: bool = False


class DLLookupResponse(BaseModel):
    success: bool
    live: bool = False
    data: Optional[DLData] = None
    error: Optional[str] = None


# ── Demo fallback ─────────────────────────────────────────────────────────────

_NAMES = [
    "Ramesh Kumar", "Suresh Singh", "Naresh Patel", "Mahesh Yadav",
    "Dinesh Gupta", "Rajesh Sharma", "Vijay Reddy", "Anil Verma",
    "Sanjay Mishra", "Rohit Thakur",
]
_FATHER_NAMES = [
    "Shiv Kumar", "Hari Singh", "Kishan Patel", "Ramlal Yadav",
    "Mohan Gupta", "Shyamlal Sharma", "Govind Reddy", "Lakhan Verma",
]
_BLOOD_GROUPS = ["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"]
_LICENSE_CLASSES = ["HGMV", "LMV,HGMV", "HMV", "LMV,HMV,HGMV"]
_RTOS = [
    "MH01 - Mumbai (Central)", "DL02 - Delhi (West)", "GJ01 - Ahmedabad",
    "RJ14 - Jaipur", "TN01 - Chennai", "KA01 - Bengaluru",
    "UP32 - Lucknow", "HR26 - Gurugram", "PB08 - Amritsar",
]

def _demo(dl_no: str, dob: str) -> DLData:
    rng = random.Random(sum(ord(c) for c in dl_no + dob))
    today = date.today()
    lc = rng.choice(_LICENSE_CLASSES)
    return DLData(
        dl_number=dl_no.upper(),
        name=rng.choice(_NAMES),
        father_name=rng.choice(_FATHER_NAMES),
        dob=dob,
        blood_group=rng.choice(_BLOOD_GROUPS),
        address=f"{rng.randint(1, 999)}, Sector {rng.randint(1,30)}, {rng.choice(['Mumbai','Delhi','Ahmedabad','Jaipur'])} - {rng.randint(400001, 500000)}",
        license_class=lc,
        license_expiry=str(today + timedelta(days=rng.choice([30, 180, 365, 730]))),
        transport_validity=str(today + timedelta(days=rng.choice([25, 90, 365]))) if "HMV" in lc or "HGMV" in lc else None,
        badge_issue_date=str(today - timedelta(days=rng.randint(365, 3650))),
        issuing_rto=rng.choice(_RTOS),
        is_demo=True,
    )


# ── Date parsing ──────────────────────────────────────────────────────────────

def _parse_date(val: Optional[str]) -> Optional[str]:
    """DD-MM-YYYY or DD/MM/YYYY → YYYY-MM-DD"""
    if not val:
        return None
    val = val.strip()
    for sep in ["-", "/"]:
        parts = val.split(sep)
        if len(parts) == 3 and len(parts[0]) == 2:
            try:
                return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            except Exception:
                pass
    return val[:10] if len(val) >= 10 else val


# ── NAPIX field mapping ───────────────────────────────────────────────────────

def _map(raw: dict, dl_no: str, dob: str) -> DLData:
    d = raw.get("response") or raw.get("data") or raw.get("result") or raw

    # License class — may be a list or comma-separated
    lc_raw = d.get("vehicleClassDesc") or d.get("licenceType") or d.get("dlClass") or ""
    if isinstance(lc_raw, list):
        lc = ",".join(lc_raw)
    else:
        lc = str(lc_raw).strip()

    return DLData(
        dl_number=dl_no.upper(),
        name=(d.get("holderName") or d.get("name") or d.get("applicantName") or "").strip().title() or None,
        father_name=(d.get("fatherOrHusbandName") or d.get("fatherName") or "").strip().title() or None,
        dob=_parse_date(d.get("dob") or d.get("dateOfBirth")) or dob,
        blood_group=(d.get("bloodGroup") or "").strip() or None,
        address=(d.get("presentAddress") or d.get("permanentAddress") or d.get("address") or "").strip() or None,
        license_class=lc or None,
        license_expiry=_parse_date(d.get("nonTransportValidUpto") or d.get("ntValidity") or d.get("validUpto")),
        transport_validity=_parse_date(d.get("transportValidUpto") or d.get("tValidity") or d.get("hgmvValidity")),
        badge_issue_date=_parse_date(d.get("badgeIssueDate") or d.get("badgeDate")),
        issuing_rto=(d.get("issuingAuthority") or d.get("rtoName") or d.get("issuingRto") or "").strip() or None,
    )


# ── NAPIX HTTP call ───────────────────────────────────────────────────────────

async def _call_napix(dl_no: str, dob: str, api_key: str) -> dict:
    headers = {
        "X-Api-Key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            NAPIX_DL_ENDPOINT,
            json={"dlNo": dl_no, "dob": dob},
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/lookup", response_model=DLLookupResponse)
async def dl_lookup(
    dl_no: str = Query(..., description="Driving licence number e.g. MH1220210012345"),
    dob: str = Query(..., description="Date of birth YYYY-MM-DD"),
):
    """
    Fetch driver licence details from Parivahan via NAPIX.
    Requires DL number + DOB (same as the public Parivahan portal).
    Falls back to realistic demo data if NAPIX key is not configured.
    """
    dl_no = dl_no.strip().upper().replace(" ", "")
    dob = dob.strip()

    if len(dl_no) < 6:
        return DLLookupResponse(success=False, error="Invalid DL number")

    key = (getattr(settings, "VAHAN_API_KEY", "") or "").strip()

    # No key → demo fallback
    if not key:
        return DLLookupResponse(success=True, live=False, data=_demo(dl_no, dob))

    try:
        raw = await _call_napix(dl_no, dob, key)

        if isinstance(raw, dict):
            status_str = str(raw.get("status") or raw.get("statusCode") or "").lower()
            if status_str in ("failure", "error", "failed") or raw.get("errorCode"):
                msg = raw.get("message") or raw.get("error") or "DL not found in Parivahan database"
                return DLLookupResponse(success=False, error=msg)

        return DLLookupResponse(success=True, live=True, data=_map(raw, dl_no, dob))

    except httpx.HTTPStatusError as e:
        msgs = {
            400: "Invalid DL number or DOB format",
            401: "NAPIX API key is invalid",
            403: "NAPIX key not approved for DL API yet",
            404: "DL not found in Parivahan database",
            429: "Rate limit hit — try again in a minute",
            503: "Parivahan service temporarily unavailable",
        }
        if e.response.status_code >= 500:
            return DLLookupResponse(success=True, live=False, data=_demo(dl_no, dob))
        return DLLookupResponse(
            success=False,
            error=msgs.get(e.response.status_code, f"NAPIX error {e.response.status_code}")
        )
    except httpx.TimeoutException:
        return DLLookupResponse(success=True, live=False, data=_demo(dl_no, dob))
    except Exception as e:
        return DLLookupResponse(success=False, error=str(e))
