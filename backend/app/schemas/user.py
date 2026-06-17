from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


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

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ProfileRead


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    hours_per_week: Optional[int] = None
    experience_level: Optional[str] = None
    avatar_url: Optional[str] = None


class SocialLogin(BaseModel):
    provider: str = Field(..., pattern="^(google|github)$")
    token: str
