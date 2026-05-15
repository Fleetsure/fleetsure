import os
import smtplib
import threading
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse

# ── Password hashing ──────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT ───────────────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── Admin signup notification ─────────────────────────────────────────────────

def _notify_admin_new_signup(name: str, email: str, method: str = "Email") -> None:
    """Fire-and-forget email to admin whenever a new user signs up."""
    def _send():
        smtp_email    = os.getenv("SMTP_EMAIL")
        smtp_password = os.getenv("SMTP_PASSWORD")
        admin_email   = os.getenv("ADMIN_EMAIL", "fleetsure.internal@gmail.com")

        if not smtp_email or not smtp_password or not admin_email:
            print(f"[FleetSure] New signup: {name} <{email}> via {method}", flush=True)
            return

        now = datetime.now().strftime("%d %b %Y, %I:%M %p")
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🚛 New FleetSure signup — {name}"
        msg["From"]    = f"FleetSure Alerts <{smtp_email}>"
        msg["To"]      = admin_email

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#f8f9ff;border-radius:14px;">
          <div style="font-size:20px;font-weight:800;color:#1E2D8E;margin-bottom:18px;">🚛 FleetSure</div>
          <div style="background:white;border-radius:10px;padding:20px 24px;border:1px solid #e8e8f0;">
            <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1a1a2e;">New signup on FleetSure!</p>
            <table style="width:100%;font-size:13.5px;color:#444;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#888;width:90px;">Name</td><td style="padding:6px 0;font-weight:600;">{name}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;font-weight:600;">{email}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Method</td><td style="padding:6px 0;">{method}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Time</td><td style="padding:6px 0;">{now}</td></tr>
            </table>
          </div>
          <p style="color:#bbb;font-size:11px;text-align:center;margin-top:18px;">FleetSure · Bengaluru</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, admin_email, msg.as_string())
            print(f"[FleetSure] Signup notification sent to {admin_email} for {email}", flush=True)
        except Exception as e:
            print(f"[FleetSure] Signup notification FAILED: {e}", flush=True)

    threading.Thread(target=_send, daemon=True).start()


# ── Public service methods ────────────────────────────────────────────────────

def register(db: Session, payload: RegisterRequest) -> TokenResponse:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=_hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _notify_admin_new_signup(user.name, user.email, method="Email")

    token = _create_access_token(user.id)
    return TokenResponse(access_token=token, user_id=user.id, name=user.name, email=user.email,
                         org_name=user.org_name, org_logo=user.org_logo)


def login(db: Session, payload: LoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )
    token = _create_access_token(user.id)
    return TokenResponse(access_token=token, user_id=user.id, name=user.name, email=user.email,
                         org_name=user.org_name, org_logo=user.org_logo)


# ── Auth dependency (inject into protected routes) ────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except jwt.PyJWTError:
        raise credentials_exc

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exc
    return user
