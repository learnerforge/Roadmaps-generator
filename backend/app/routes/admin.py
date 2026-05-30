from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.core.security import get_current_admin
from app.models.user import Profile
from app.models.roadmap import Roadmap, RoadmapNode
from app.models.feedback import Feedback
from app.utils.db_helpers import parse_uuid
from app.utils.pagination import PaginationParams

router = APIRouter()


@router.get("/stats")
async def admin_stats(
    user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    users_q = select(func.count(Profile.id))
    users = (await db.execute(users_q)).scalar() or 0

    roadmaps_q = select(func.count(Roadmap.id))
    roadmaps = (await db.execute(roadmaps_q)).scalar() or 0

    published_q = select(func.count(Roadmap.id)).where(Roadmap.is_published == True)
    published = (await db.execute(published_q)).scalar() or 0

    feedback_q = select(func.count(Feedback.id)).where(Feedback.status == "open")
    feedback = (await db.execute(feedback_q)).scalar() or 0

    nodes_q = select(func.count(RoadmapNode.id))
    nodes = (await db.execute(nodes_q)).scalar() or 0

    return {
        "total_users": users,
        "total_roadmaps": roadmaps,
        "published_roadmaps": published,
        "total_nodes": nodes,
        "open_feedback": feedback,
    }


@router.get("/users")
async def list_users(
    pagination: PaginationParams = Depends(),
    user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_q = select(func.count(Profile.id))
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(
        select(Profile).order_by(Profile.created_at.desc())
        .offset(pagination.offset).limit(pagination.per_page)
    )
    users = result.scalars().all()
    return {
        "items": [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "role": u.role,
                "experience_level": u.experience_level,
                "streak_days": u.streak_days,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": total,
        "page": pagination.page,
        "per_page": pagination.per_page,
    }


@router.patch("/users/{user_id}/role")
async def change_role(
    user_id: str,
    data: dict,
    user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin only")

    uid = parse_uuid(user_id, "user_id")
    result = await db.execute(select(Profile).where(Profile.id == uid))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.role = data.get("role", target.role)
    await db.commit()
    return {"success": True, "new_role": target.role}


@router.get("/feedback")
async def list_feedback(
    pagination: PaginationParams = Depends(),
    user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_q = select(func.count(Feedback.id))
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(
        select(Feedback).order_by(Feedback.created_at.desc())
        .offset(pagination.offset).limit(pagination.per_page)
    )
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": str(f.id),
                "user_id": str(f.user_id),
                "node_id": str(f.node_id) if f.node_id else None,
                "type": f.type,
                "content": f.content,
                "status": f.status,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in items
        ],
        "total": total,
        "page": pagination.page,
        "per_page": pagination.per_page,
    }


@router.patch("/feedback/{feedback_id}")
async def update_feedback(
    feedback_id: str,
    data: dict,
    user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(feedback_id, "feedback_id")
    result = await db.execute(select(Feedback).where(Feedback.id == uid))
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    fb.status = data.get("status", fb.status)
    await db.commit()
    return {"success": True}
