import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, UpdateProfileRequest
from app.services.auth_service import register, login, get_current_user, _create_access_token, _hash_password
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    return register(db, payload)


@router.post("/login", response_model=TokenResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    return login(db, payload)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/google")
def google_login(payload: dict, db: Session = Depends(get_db)):
    """Verify a Google ID token and return our JWT."""
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    import hashlib

    credential = payload.get("credential")
    if not credential:
        raise HTTPException(400, "Missing credential")

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(500, "Google OAuth not configured on server")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), client_id
        )
    except ValueError as e:
        raise HTTPException(401, f"Invalid Google token: {e}")

    email = idinfo.get("email")
    name  = idinfo.get("name", email.split("@")[0])

    if not email:
        raise HTTPException(400, "Could not extract email from Google token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            hashed_password=hashlib.sha256(b"GOOGLE_OAUTH_NO_PASSWORD").hexdigest(),
        )
        db.add(user); db.commit(); db.refresh(user)

    token = _create_access_token(user.id)
    return TokenResponse(
        access_token=token, user_id=user.id,
        name=user.name, email=user.email,
        org_name=user.org_name, org_logo=user.org_logo,
    )
