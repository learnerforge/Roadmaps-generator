import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import Profile
from app.schemas.user import UserRegister, UserLogin, TokenResponse, ProfileRead
from app.core.security import hash_password, verify_password, create_token

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Profile).where(Profile.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = Profile(
        id=uuid.uuid4(),
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(str(user.id), user.role)
    return TokenResponse(
        access_token=token,
        user=ProfileRead.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(str(user.id), user.role)
    return TokenResponse(
        access_token=token,
        user=ProfileRead.model_validate(user),
    )
