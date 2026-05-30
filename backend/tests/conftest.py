import asyncio
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.db.session import Base, get_db
from app.core.config import get_settings
from app.core.security import hash_password, create_token
from app.models.user import Profile
from app.models.roadmap import Roadmap, RoadmapNode, NodeDependency
from app.models.progress import UserRoadmap, UserNodeProgress
from app.models.content import Note, Bookmark, AIExplanation
from app.models.quiz import Quiz, QuizAttempt
from app.models.resource import Resource
from app.models.feedback import Feedback

TEST_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/pathforge_test"

test_settings = get_settings()
test_settings.DATABASE_URL = TEST_DB_URL
test_settings.DEBUG = False
test_settings.JWT_SECRET = "test-secret-do-not-use"
test_settings.JWT_EXPIRY_MINUTES = 60

test_engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
TestAsyncSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestAsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> Profile:
    user = Profile(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash=hash_password("testpass123"),
        full_name="Test User",
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db: AsyncSession) -> Profile:
    user = Profile(
        id=uuid.uuid4(),
        email="admin@example.com",
        password_hash=hash_password("adminpass123"),
        full_name="Admin User",
        role="admin",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def super_admin(db: AsyncSession) -> Profile:
    user = Profile(
        id=uuid.uuid4(),
        email="super@example.com",
        password_hash=hash_password("superpass123"),
        full_name="Super Admin",
        role="super_admin",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def user_token(test_user: Profile) -> str:
    return create_token(str(test_user.id), test_user.role)


@pytest_asyncio.fixture
async def admin_token(test_admin: Profile) -> str:
    return create_token(str(test_admin.id), test_admin.role)


@pytest_asyncio.fixture
async def super_admin_token(super_admin: Profile) -> str:
    return create_token(str(super_admin.id), super_admin.role)


@pytest_asyncio.fixture
async def auth_headers(user_token: str) -> dict:
    return {"Authorization": f"Bearer {user_token}"}


@pytest_asyncio.fixture
async def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def super_admin_headers(super_admin_token: str) -> dict:
    return {"Authorization": f"Bearer {super_admin_token}"}


@pytest_asyncio.fixture
async def test_roadmap(db: AsyncSession) -> Roadmap:
    rm = Roadmap(
        id=uuid.uuid4(),
        title="Test Roadmap",
        slug="test-roadmap",
        description="A test roadmap",
        category="skill-based",
        difficulty="beginner",
        is_published=True,
    )
    db.add(rm)
    await db.commit()
    await db.refresh(rm)
    return rm


@pytest_asyncio.fixture
async def test_roadmap_nodes(db: AsyncSession, test_roadmap: Roadmap) -> list[RoadmapNode]:
    nodes = []
    for i in range(3):
        node = RoadmapNode(
            id=uuid.uuid4(),
            roadmap_id=test_roadmap.id,
            title=f"Node {i + 1}",
            description=f"Description for node {i + 1}",
            category="basics",
            order_index=i,
            node_type="topic",
        )
        db.add(node)
        nodes.append(node)
    await db.commit()
    for n in nodes:
        await db.refresh(n)
    # Add dependency: node1 -> node2
    dep = NodeDependency(node_id=nodes[1].id, depends_on_node_id=nodes[0].id)
    db.add(dep)
    await db.commit()
    return nodes


@pytest_asyncio.fixture
async def enrolled_roadmap(db: AsyncSession, test_user: Profile, test_roadmap: Roadmap) -> UserRoadmap:
    ur = UserRoadmap(user_id=test_user.id, roadmap_id=test_roadmap.id)
    db.add(ur)
    await db.commit()
    return ur
