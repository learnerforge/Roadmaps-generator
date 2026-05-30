import uuid as uuid_lib
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.roadmap import Roadmap


def parse_uuid(val: str, name: str = "id") -> uuid_lib.UUID:
    try:
        return uuid_lib.UUID(val)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {name}: {val}")


async def resolve_roadmap(db: AsyncSession, ref: str) -> Roadmap:
    try:
        uid = uuid_lib.UUID(ref)
        result = await db.execute(select(Roadmap).where(Roadmap.id == uid))
    except ValueError:
        result = await db.execute(select(Roadmap).where(Roadmap.slug == ref))
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return roadmap
