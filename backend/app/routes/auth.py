from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.user import Profile
from app.models.roadmap import Roadmap, RoadmapNode
from app.schemas.user import ProfileUpdate, ProfileRead
from app.schemas.roadmap import (
    RoadmapCreate, RoadmapUpdate, RoadmapRead,
    NodeCreate, NodeUpdate, NodeRead, ResourceCreate, ResourceRead,
)
from app.models.resource import Resource

router = APIRouter()


@router.get("/me", response_model=ProfileRead)
async def get_me(user: Profile = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=ProfileRead)
async def update_me(
    data: ProfileUpdate,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
