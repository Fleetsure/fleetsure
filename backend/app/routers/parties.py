from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.party import Party
from app.models.user import User
from app.schemas.party import PartyCreate, PartyUpdate, PartyResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/parties", tags=["Parties"])


@router.post("/", response_model=PartyResponse, status_code=201)
def create_party(
    payload: PartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    party = Party(**payload.model_dump(), owner_id=current_user.id)
    db.add(party)
    db.commit()
    db.refresh(party)
    return party


@router.get("/", response_model=List[PartyResponse])
def get_parties(
    party_type: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Party).filter(Party.owner_id == current_user.id).order_by(Party.name)
    if party_type:
        q = q.filter(Party.party_type == party_type)
    return q.offset(skip).limit(limit).all()


@router.get("/{party_id}", response_model=PartyResponse)
def get_party(
    party_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Party).filter(Party.id == party_id, Party.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(404, "Party not found")
    return p


@router.patch("/{party_id}", response_model=PartyResponse)
def update_party(
    party_id: UUID,
    payload: PartyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Party).filter(Party.id == party_id, Party.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(404, "Party not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{party_id}", status_code=204)
def delete_party(
    party_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Party).filter(Party.id == party_id, Party.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(404, "Party not found")
    db.delete(p)
    db.commit()
