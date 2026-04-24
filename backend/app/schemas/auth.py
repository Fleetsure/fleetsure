from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    name: str
    email: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
