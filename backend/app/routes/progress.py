import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sa_delete
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import Profile
from app.models.roadmap import Roadmap, RoadmapNode
from app.models.progress import UserRoadmap, UserNodeProgress
from app.schemas.progress import NodeProgressUpdate, DashboardSummary
from app.utils.db_helpers import parse_uuid, resolve_roadmap
from app.utils.pagination import PaginationParams
from datetime import datetime, timezone

router = APIRouter()


@router.post("/{roadmap_ref}/start", status_code=status.HTTP_201_CREATED)
async def start_roadmap(
    roadmap_ref: str,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    roadmap = await resolve_roadmap(db, roadmap_ref)
    existing = await db.execute(
        select(UserRoadmap).where(
            UserRoadmap.user_id == user.id,
            UserRoadmap.roadmap_id == roadmap.id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already enrolled"}

    user_roadmap = UserRoadmap(user_id=user.id, roadmap_id=roadmap.id)
    db.add(user_roadmap)
    await db.commit()
    return {"message": "Enrolled successfully"}


@router.delete("/{roadmap_ref}/unenroll", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_roadmap(
    roadmap_ref: str,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    roadmap = await resolve_roadmap(db, roadmap_ref)
    result = await db.execute(
        select(UserRoadmap).where(
            UserRoadmap.user_id == user.id,
            UserRoadmap.roadmap_id == roadmap.id,
        )
    )
    ur = result.scalar_one_or_none()
    if not ur:
        raise HTTPException(status_code=404, detail="Not enrolled in this roadmap")

    await db.execute(
        sa_delete(UserNodeProgress).where(
            UserNodeProgress.user_id == user.id,
            UserNodeProgress.roadmap_id == roadmap.id,
        )
    )
    await db.delete(ur)
    await db.commit()


@router.get("/{roadmap_ref}/progress")
async def get_progress(
    roadmap_ref: str,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    roadmap = await resolve_roadmap(db, roadmap_ref)
    result = await db.execute(
        select(UserNodeProgress).where(
            UserNodeProgress.user_id == user.id,
            UserNodeProgress.roadmap_id == roadmap.id,
        )
    )
    progress = result.scalars().all()
    return {
        "progress": [
            {
                "node_id": str(p.node_id),
                "status": p.status,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in progress
        ]
    }


@router.patch("/node/{node_id}")
async def update_node_status(
    node_id: str,
    data: NodeProgressUpdate,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(node_id, "node_id")
    node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == uid))
    node = node_result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    result = await db.execute(
        select(UserNodeProgress).where(
            UserNodeProgress.user_id == user.id,
            UserNodeProgress.node_id == uid,
        )
    )
    progress = result.scalar_one_or_none()

    if progress:
        progress.status = data.status
    else:
        progress = UserNodeProgress(
            user_id=user.id,
            node_id=uid,
            roadmap_id=node.roadmap_id,
            status=data.status,
        )
        db.add(progress)

    total_q = select(func.count(RoadmapNode.id)).where(RoadmapNode.roadmap_id == node.roadmap_id)
    total = (await db.execute(total_q)).scalar() or 0

    done_q = select(func.count(UserNodeProgress.id)).where(
        UserNodeProgress.user_id == user.id,
        UserNodeProgress.roadmap_id == node.roadmap_id,
        UserNodeProgress.status == "done",
    )
    done = (await db.execute(done_q)).scalar() or 0

    pct = (done / total * 100) if total > 0 else 0

    ur_result = await db.execute(
        select(UserRoadmap).where(
            UserRoadmap.user_id == user.id,
            UserRoadmap.roadmap_id == node.roadmap_id,
        )
    )
    ur = ur_result.scalar_one_or_none()
    if ur:
        ur.completion_pct = pct
        if pct >= 100:
            ur.completed_at = datetime.now(timezone.utc)

    await db.commit()

    return {"status": data.status, "completion_pct": pct, "node_id": node_id}


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard(
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    active_q = select(func.count(UserRoadmap.roadmap_id)).where(UserRoadmap.user_id == user.id)
    active = (await db.execute(active_q)).scalar() or 0

    done_q = select(func.count(UserNodeProgress.id)).where(
        UserNodeProgress.user_id == user.id,
        UserNodeProgress.status == "done",
    )
    done = (await db.execute(done_q)).scalar() or 0

    return DashboardSummary(
        active_roadmaps=active,
        total_nodes_completed=done,
        streak_days=user.streak_days,
        recent_activity=[],
    )


@router.get("/my-roadmaps")
async def my_roadmaps(
    pagination: PaginationParams = Depends(),
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_q = select(func.count(UserRoadmap.roadmap_id)).where(UserRoadmap.user_id == user.id)
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(
        select(UserRoadmap, Roadmap)
        .join(Roadmap, UserRoadmap.roadmap_id == Roadmap.id)
        .where(UserRoadmap.user_id == user.id)
        .order_by(UserRoadmap.started_at.desc())
        .offset(pagination.offset).limit(pagination.per_page)
    )
    rows = result.all()
    return {
        "items": [
            {
                "roadmap": {
                    "id": str(rm.id),
                    "title": rm.title,
                    "slug": rm.slug,
                    "category": rm.category,
                    "cover_image_url": rm.cover_image_url,
                },
                "started_at": ur.started_at.isoformat() if ur.started_at else None,
                "completion_pct": ur.completion_pct,
                "is_pinned": ur.is_pinned,
            }
            for ur, rm in rows
        ],
        "total": total,
        "page": pagination.page,
        "per_page": pagination.per_page,
    }


@router.get("/export/{roadmap_ref}")
async def export_progress(
    roadmap_ref: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    roadmap = await resolve_roadmap(db, roadmap_ref)
    nodes_result = await db.execute(
        select(RoadmapNode)
        .where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index)
    )
    nodes = nodes_result.scalars().all()

    progress_result = await db.execute(
        select(UserNodeProgress).where(
            UserNodeProgress.user_id == user.id,
            UserNodeProgress.roadmap_id == roadmap.id,
        )
    )
    progress_map = {p.node_id: p.status for p in progress_result.scalars().all()}

    node_data = [
        {
            "title": n.title,
            "category": n.category or "",
            "difficulty": n.difficulty,
            "estimated_hours": n.estimated_hours,
            "status": progress_map.get(n.id, "pending"),
        }
        for n in nodes
    ]

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["title", "category", "difficulty", "estimated_hours", "status"])
        writer.writeheader()
        writer.writerows(node_data)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={roadmap.slug}_progress.csv"},
        )

    return {
        "roadmap": roadmap.title,
        "slug": roadmap.slug,
        "total_nodes": len(nodes),
        "completed": sum(1 for d in node_data if d["status"] == "done"),
        "progress": node_data,
    }
