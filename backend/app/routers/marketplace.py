from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.marketplace import ReturnLoad, LoadInterest, LoadStatus, InterestStatus
from app.models.trip import Trip, TripStatus
from app.models.user import User
from app.schemas.marketplace import (
    ReturnLoadCreate, ReturnLoadUpdate, ReturnLoadResponse,
    InterestCreate, InterestUpdate, InterestResponse,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich_load(load: ReturnLoad, current_user: User, db: Session) -> ReturnLoadResponse:
    """Add owner info, interest count, and whether the current user already expressed interest."""
    owner = db.query(User).filter(User.id == load.owner_id).first()
    owner_trips = (
        db.query(Trip)
        .filter(Trip.owner_id == load.owner_id, Trip.status == TripStatus.COMPLETED)
        .count()
    )
    interest_count = len([i for i in load.interests if i.status != InterestStatus.WITHDRAWN])
    my_interest = next(
        (i for i in load.interests if str(i.interested_user_id) == str(current_user.id)),
        None,
    )
    return ReturnLoadResponse(
        **{c.name: getattr(load, c.name) for c in load.__table__.columns},
        owner_name=owner.name if owner else None,
        owner_trips=owner_trips,
        interest_count=interest_count,
        my_interest_id=my_interest.id if my_interest else None,
    )


# ── Return Load endpoints ─────────────────────────────────────────────────────

@router.post("/loads", response_model=ReturnLoadResponse, status_code=201)
def post_return_load(
    payload: ReturnLoadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Post your truck as available for a return/backhaul load."""
    data = payload.model_dump()
    # Default contact info from user profile
    if not data.get("contact_phone") and hasattr(current_user, "phone"):
        data["contact_phone"] = current_user.phone
    if not data.get("contact_name"):
        data["contact_name"] = current_user.name

    load = ReturnLoad(**data, owner_id=current_user.id)
    db.add(load)
    db.commit()
    db.refresh(load)
    return _enrich_load(load, current_user, db)


@router.get("/loads", response_model=List[ReturnLoadResponse])
def browse_loads(
    from_city: Optional[str] = Query(None),
    to_city:   Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date:   Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse all open return loads from the fleet network."""
    today = date.today()
    q = (
        db.query(ReturnLoad)
        .filter(ReturnLoad.status == LoadStatus.OPEN)
        .filter(ReturnLoad.available_date >= today)       # hide past listings
    )
    if from_city:
        q = q.filter(ReturnLoad.from_city.ilike(f"%{from_city}%"))
    if to_city:
        q = q.filter(ReturnLoad.to_city.ilike(f"%{to_city}%"))
    if from_date:
        q = q.filter(ReturnLoad.available_date >= from_date)
    if to_date:
        q = q.filter(ReturnLoad.available_date <= to_date)

    loads = q.order_by(ReturnLoad.available_date.asc()).offset(skip).limit(limit).all()
    return [_enrich_load(l, current_user, db) for l in loads]


@router.get("/loads/mine", response_model=List[ReturnLoadResponse])
def my_loads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All loads posted by the current user (any status)."""
    loads = (
        db.query(ReturnLoad)
        .filter(ReturnLoad.owner_id == current_user.id)
        .order_by(ReturnLoad.created_at.desc())
        .all()
    )
    return [_enrich_load(l, current_user, db) for l in loads]


@router.get("/loads/{load_id}", response_model=ReturnLoadResponse)
def get_load(
    load_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    load = db.query(ReturnLoad).filter(ReturnLoad.id == load_id).first()
    if not load:
        raise HTTPException(404, "Load not found")
    return _enrich_load(load, current_user, db)


@router.patch("/loads/{load_id}", response_model=ReturnLoadResponse)
def update_load(
    load_id: UUID,
    payload: ReturnLoadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    load = db.query(ReturnLoad).filter(
        ReturnLoad.id == load_id, ReturnLoad.owner_id == current_user.id
    ).first()
    if not load:
        raise HTTPException(404, "Load not found or not yours")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(load, k, v)
    db.commit()
    db.refresh(load)
    return _enrich_load(load, current_user, db)


@router.delete("/loads/{load_id}", status_code=204)
def cancel_load(
    load_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    load = db.query(ReturnLoad).filter(
        ReturnLoad.id == load_id, ReturnLoad.owner_id == current_user.id
    ).first()
    if not load:
        raise HTTPException(404, "Load not found or not yours")
    load.status = LoadStatus.CANCELLED
    db.commit()


# ── Interest endpoints ────────────────────────────────────────────────────────

@router.post("/loads/{load_id}/interest", response_model=InterestResponse, status_code=201)
def express_interest(
    load_id: UUID,
    payload: InterestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Express interest in someone else's return load."""
    load = db.query(ReturnLoad).filter(
        ReturnLoad.id == load_id, ReturnLoad.status == LoadStatus.OPEN
    ).first()
    if not load:
        raise HTTPException(404, "Load not found or not open")
    if str(load.owner_id) == str(current_user.id):
        raise HTTPException(400, "Cannot express interest in your own load")

    # Prevent duplicate interests
    existing = db.query(LoadInterest).filter(
        LoadInterest.return_load_id == load_id,
        LoadInterest.interested_user_id == current_user.id,
        LoadInterest.status != InterestStatus.WITHDRAWN,
    ).first()
    if existing:
        raise HTTPException(409, "You have already expressed interest in this load")

    interest = LoadInterest(
        return_load_id=load_id,
        interested_user_id=current_user.id,
        message=payload.message,
    )
    db.add(interest)
    db.commit()
    db.refresh(interest)
    return _enrich_interest(interest, db)


@router.get("/interests/received", response_model=List[InterestResponse])
def interests_received(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Interests other fleet owners sent on MY loads."""
    my_load_ids = [
        r.id for r in db.query(ReturnLoad.id)
        .filter(ReturnLoad.owner_id == current_user.id).all()
    ]
    interests = (
        db.query(LoadInterest)
        .filter(LoadInterest.return_load_id.in_(my_load_ids))
        .order_by(LoadInterest.created_at.desc())
        .all()
    )
    return [_enrich_interest(i, db) for i in interests]


@router.get("/interests/sent", response_model=List[InterestResponse])
def interests_sent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Interests I have sent on other fleet owners' loads."""
    interests = (
        db.query(LoadInterest)
        .filter(LoadInterest.interested_user_id == current_user.id)
        .order_by(LoadInterest.created_at.desc())
        .all()
    )
    return [_enrich_interest(i, db) for i in interests]


@router.patch("/interests/{interest_id}", response_model=InterestResponse)
def update_interest(
    interest_id: UUID,
    payload: InterestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Load owner: accept or reject an interest.
    Interested party: withdraw their interest or submit a rating.
    """
    interest = db.query(LoadInterest).filter(LoadInterest.id == interest_id).first()
    if not interest:
        raise HTTPException(404, "Interest not found")

    load = db.query(ReturnLoad).filter(ReturnLoad.id == interest.return_load_id).first()
    is_load_owner       = str(load.owner_id) == str(current_user.id)
    is_interested_party = str(interest.interested_user_id) == str(current_user.id)

    if not is_load_owner and not is_interested_party:
        raise HTTPException(403, "Not authorised")

    if payload.status:
        new_status = payload.status.lower()
        if new_status in ("accepted", "rejected") and not is_load_owner:
            raise HTTPException(403, "Only the load owner can accept/reject")
        if new_status == "withdrawn" and not is_interested_party:
            raise HTTPException(403, "Only the interested party can withdraw")
        interest.status = InterestStatus(new_status)

        # When a match is accepted, mark the load as matched
        if new_status == "accepted":
            load.status = LoadStatus.MATCHED

    if payload.rating is not None:
        interest.rating = payload.rating

    db.commit()
    db.refresh(interest)
    return _enrich_interest(interest, db)


# ── Interest enrichment helper ────────────────────────────────────────────────

def _enrich_interest(interest: LoadInterest, db: Session) -> InterestResponse:
    interested_user = db.query(User).filter(User.id == interest.interested_user_id).first()
    load = db.query(ReturnLoad).filter(ReturnLoad.id == interest.return_load_id).first()
    load_owner = db.query(User).filter(User.id == load.owner_id).first() if load else None
    return InterestResponse(
        **{c.name: getattr(interest, c.name) for c in interest.__table__.columns},
        interested_user_name=interested_user.name if interested_user else None,
        interested_user_phone=getattr(interested_user, "phone", None),
        load_from_city=load.from_city if load else None,
        load_to_city=load.to_city if load else None,
        load_date=load.available_date if load else None,
        load_owner_name=load_owner.name if load_owner else None,
        load_owner_phone=getattr(load_owner, "phone", None),
    )
