import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.models.user import Profile
from app.schemas.user import UserRegister, UserLogin, SocialLogin, TokenResponse, ProfileRead
from app.core.security import hash_password, verify_password, create_token
from app.core.config import get_settings

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = Profile(
        id=uuid.uuid4(),
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role="user",
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")

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


@router.post("/social", response_model=TokenResponse)
async def social_login(data: SocialLogin, db: AsyncSession = Depends(get_db)):
    settings = get_settings()

    if data.provider == "google":
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {data.token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")
            info = resp.json()
            if not settings.GOOGLE_CLIENT_ID:
                raise HTTPException(status_code=500, detail="Google OAuth not configured")
            email = info.get("email")
            name = info.get("name", email.split("@")[0] if email else "User")
            avatar = info.get("picture")

    elif data.provider == "github":
        async with httpx.AsyncClient() as client:
            if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
                raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

            token_exchange = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": data.token,
                },
                headers={"Accept": "application/json"},
            )
            if token_exchange.status_code != 200:
                raise HTTPException(status_code=401, detail="GitHub token exchange failed")
            token_data = token_exchange.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(status_code=401, detail="GitHub token exchange failed")

            resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid GitHub token")
            info = resp.json()
            github_email = info.get("email")
            if not github_email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if emails_resp.status_code == 200:
                    emails = emails_resp.json()
                    primary = next((e for e in emails if e.get("primary")), {})
                    github_email = primary.get("email")
            email = github_email
            name = info.get("name") or info.get("login", "User")
            avatar = info.get("avatar_url")

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {data.provider}")

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from provider")

    result = await db.execute(select(Profile).where(Profile.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = Profile(
            id=uuid.uuid4(),
            email=email,
            full_name=name,
            avatar_url=avatar,
            role="user",
        )
        db.add(user)
        try:
            await db.commit()
        except Exception:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Email already registered")
        await db.refresh(user)

    token = create_token(str(user.id), user.role)
    return TokenResponse(
        access_token=token,
        user=ProfileRead.model_validate(user),
    )
