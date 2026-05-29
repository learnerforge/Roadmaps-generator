import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, SmallInteger, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(100), nullable=False)
    avatar_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    current_role = Column(String(100), nullable=True)
    target_role = Column(String(100), nullable=True)
    hours_per_week = Column(SmallInteger, default=10)
    experience_level = Column(String(20), default="beginner")
    role = Column(String(20), default="user")
    is_public = Column(Boolean, default=False)
    streak_days = Column(Integer, default=0)
    last_active_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
