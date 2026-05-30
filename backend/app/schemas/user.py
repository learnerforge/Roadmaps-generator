from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "ProfileRead"


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    hours_per_week: Optional[int] = None
    experience_level: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileRead(BaseModel):
    id: UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    hours_per_week: int
    experience_level: str
    role: str
    is_public: bool
    streak_days: int
    created_at: datetime

    class Config:
        from_attributes = True
