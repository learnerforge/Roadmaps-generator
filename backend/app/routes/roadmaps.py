from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.db.session import get_db
from app.core.security import get_current_admin, get_optional_user
from app.models.user import Profile
from app.models.roadmap import Roadmap, RoadmapNode, NodeDependency
from app.models.resource import Resource
from app.models.content import Bookmark
from app.models.progress import UserNodeProgress
from app.schemas.roadmap import (
    RoadmapCreate, RoadmapUpdate, RoadmapRead,
    NodeCreate, NodeUpdate, NodeRead,
    ResourceCreate, ResourceRead,
)
from app.utils.db_helpers import parse_uuid, resolve_roadmap
from app.utils.pagination import PaginationParams

router = APIRouter()


class NodeDetailRead(NodeRead):
    status: str = "pending"
    is_bookmarked: bool = False
    dependencies: list[dict] = []
    dependents: list[dict] = []
    resources: list[ResourceRead] = []


@router.get("", response_model=list[RoadmapRead])
async def list_roadmaps(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
):
    query = select(Roadmap).where(Roadmap.is_published == True)
    if category:
        query = query.where(Roadmap.category == category)
    if difficulty:
        query = query.where(Roadmap.difficulty == difficulty)
    if search:
        query = query.where(Roadmap.title.ilike(f"%{search}%"))

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    query = query.order_by(Roadmap.created_at.desc()).offset(pagination.offset).limit(pagination.per_page)
    result = await db.execute(query)
    roadmaps = result.scalars().all()

    # Batch-fetch node counts (single query instead of N+1)
    if roadmaps:
        roadmap_ids = [r.id for r in roadmaps]
        count_q = select(
            RoadmapNode.roadmap_id, func.count(RoadmapNode.id).label("nc")
        ).where(RoadmapNode.roadmap_id.in_(roadmap_ids)).group_by(RoadmapNode.roadmap_id)
        count_result = await db.execute(count_q)
        node_counts = {row.roadmap_id: row.nc for row in count_result}
    else:
        node_counts = {}

    enriched = [
        RoadmapRead(
            id=rm.id, title=rm.title, slug=rm.slug, description=rm.description,
            category=rm.category, difficulty=rm.difficulty, estimated_hours=rm.estimated_hours,
            cover_image_url=rm.cover_image_url, is_published=rm.is_published,
            created_at=rm.created_at, node_count=node_counts.get(rm.id, 0),
        )
        for rm in roadmaps
    ]
    return enriched


@router.get("/nodes/{node_id}", response_model=NodeDetailRead)
async def get_node_detail(
    node_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[Profile] = Depends(get_optional_user),
):
    uid = parse_uuid(node_id, "node_id")
    result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == uid))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    dep_result = await db.execute(
        select(NodeDependency, RoadmapNode.title)
        .join(RoadmapNode, NodeDependency.depends_on_node_id == RoadmapNode.id)
        .where(NodeDependency.node_id == uid)
    )
    dependencies = [
        {"node_id": str(dep.depends_on_node_id), "title": title}
        for dep, title in dep_result.all()
    ]

    dep_of_result = await db.execute(
        select(NodeDependency, RoadmapNode.title)
        .join(RoadmapNode, NodeDependency.node_id == RoadmapNode.id)
        .where(NodeDependency.depends_on_node_id == uid)
    )
    dependents = [
        {"node_id": str(dep.node_id), "title": title}
        for dep, title in dep_of_result.all()
    ]

    res_result = await db.execute(
        select(Resource).where(Resource.node_id == uid)
    )
    resources = res_result.scalars().all()

    status = "pending"
    is_bookmarked = False
    if user:
        prog = await db.execute(
            select(UserNodeProgress).where(
                UserNodeProgress.user_id == user.id,
                UserNodeProgress.node_id == uid,
            )
        )
        p = prog.scalar_one_or_none()
        if p:
            status = p.status
        bm = await db.execute(
            select(Bookmark).where(
                Bookmark.user_id == user.id,
                Bookmark.node_id == uid,
            )
        )
        if bm.scalar_one_or_none():
            is_bookmarked = True

    return NodeDetailRead(
        id=node.id, roadmap_id=node.roadmap_id, title=node.title,
        description=node.description, why_important=node.why_important,
        category=node.category, source_node_id=node.source_node_id,
        node_type=node.node_type, position_x=node.position_x,
        position_y=node.position_y, width=node.width, height=node.height,
        order_index=node.order_index, is_optional=node.is_optional,
        difficulty=node.difficulty, estimated_hours=node.estimated_hours,
        created_at=node.created_at,
        status=status,
        is_bookmarked=is_bookmarked,
        dependencies=dependencies,
        dependents=dependents,
        resources=[ResourceRead.model_validate(r) for r in resources],
    )


@router.get("/nodes/{node_id}/dependencies")
async def get_node_dependencies(
    node_id: str,
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(node_id, "node_id")
    dep_result = await db.execute(
        select(NodeDependency, RoadmapNode.title, RoadmapNode.id)
        .join(RoadmapNode, NodeDependency.depends_on_node_id == RoadmapNode.id)
        .where(NodeDependency.node_id == uid)
    )
    deps = [
        {"node_id": str(dep.depends_on_node_id), "title": title, "id": str(nid)}
        for dep, title, nid in dep_result.all()
    ]

    dep_of_result = await db.execute(
        select(NodeDependency, RoadmapNode.title, RoadmapNode.id)
        .join(RoadmapNode, NodeDependency.node_id == RoadmapNode.id)
        .where(NodeDependency.depends_on_node_id == uid)
    )
    dep_of = [
        {"node_id": str(dep.node_id), "title": title, "id": str(nid)}
        for dep, title, nid in dep_of_result.all()
    ]

    return {"depends_on": deps, "required_by": dep_of}


@router.get("/nodes/{node_id}/resources", response_model=list[ResourceRead])
async def list_resources(node_id: str, db: AsyncSession = Depends(get_db)):
    uid = parse_uuid(node_id, "node_id")
    result = await db.execute(
        select(Resource).where(Resource.node_id == uid)
    )
    return result.scalars().all()


@router.post("/nodes/{node_id}/resources", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
async def create_resource(
    node_id: str,
    data: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(node_id, "node_id")
    node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == uid))
    if not node_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Node not found")
    resource = Resource(node_id=uid, **data.model_dump())
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


@router.patch("/nodes/{node_id}", response_model=NodeRead)
async def update_node(
    node_id: str,
    data: NodeUpdate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(node_id, "node_id")
    result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == uid))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(node, field, value)
    await db.commit()
    await db.refresh(node)
    return node


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(node_id, "node_id")
    result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == uid))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    dep_check = await db.execute(
        select(NodeDependency).where(NodeDependency.depends_on_node_id == uid)
    )
    if dep_check.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Cannot delete node: other nodes depend on it. Remove dependencies first.",
        )

    await db.delete(node)
    await db.commit()


@router.get("/{slug}")
async def get_roadmap(slug: str, db: AsyncSession = Depends(get_db)):
    roadmap = await resolve_roadmap(db, slug)
    nodes_result = await db.execute(
        select(RoadmapNode)
        .where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index)
    )
    nodes = nodes_result.scalars().all()
    return {
        "roadmap": roadmap,
        "nodes": nodes,
    }


@router.post("", response_model=RoadmapRead, status_code=status.HTTP_201_CREATED)
async def create_roadmap(
    data: RoadmapCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    existing = await db.execute(select(Roadmap).where(Roadmap.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")

    roadmap = Roadmap(**data.model_dump(), created_by=user.id)
    db.add(roadmap)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Slug already exists (concurrent)")
    await db.refresh(roadmap)
    return RoadmapRead(
        id=roadmap.id, title=roadmap.title, slug=roadmap.slug,
        description=roadmap.description, category=roadmap.category,
        difficulty=roadmap.difficulty, estimated_hours=roadmap.estimated_hours,
        cover_image_url=roadmap.cover_image_url, is_published=roadmap.is_published,
        created_at=roadmap.created_at, node_count=0,
    )


@router.patch("/{roadmap_id}", response_model=RoadmapRead)
async def update_roadmap(
    roadmap_id: str,
    data: RoadmapUpdate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(roadmap_id, "roadmap_id")
    result = await db.execute(select(Roadmap).where(Roadmap.id == uid))
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(roadmap, field, value)
    await db.commit()
    await db.refresh(roadmap)

    node_count_q = select(func.count(RoadmapNode.id)).where(RoadmapNode.roadmap_id == roadmap.id)
    node_count = (await db.execute(node_count_q)).scalar() or 0
    return RoadmapRead(
        id=roadmap.id, title=roadmap.title, slug=roadmap.slug,
        description=roadmap.description, category=roadmap.category,
        difficulty=roadmap.difficulty, estimated_hours=roadmap.estimated_hours,
        cover_image_url=roadmap.cover_image_url, is_published=roadmap.is_published,
        created_at=roadmap.created_at, node_count=node_count,
    )


@router.delete("/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roadmap(
    roadmap_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(roadmap_id, "roadmap_id")
    result = await db.execute(select(Roadmap).where(Roadmap.id == uid))
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    await db.delete(roadmap)
    await db.commit()


@router.patch("/{roadmap_id}/publish")
async def toggle_publish(
    roadmap_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(roadmap_id, "roadmap_id")
    result = await db.execute(select(Roadmap).where(Roadmap.id == uid))
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    roadmap.is_published = data.get("is_published", not roadmap.is_published)
    await db.commit()
    return {"is_published": roadmap.is_published}


@router.get("/{roadmap_id}/nodes", response_model=list[NodeRead])
async def list_nodes(roadmap_id: str, db: AsyncSession = Depends(get_db)):
    roadmap = await resolve_roadmap(db, roadmap_id)
    result = await db.execute(
        select(RoadmapNode)
        .where(RoadmapNode.roadmap_id == roadmap.id)
        .order_by(RoadmapNode.order_index)
    )
    return result.scalars().all()


@router.post("/{roadmap_id}/nodes", response_model=NodeRead, status_code=status.HTTP_201_CREATED)
async def create_node(
    roadmap_id: str,
    data: NodeCreate,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(roadmap_id, "roadmap_id")
    node = RoadmapNode(roadmap_id=uid, **data.model_dump())
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_admin),
):
    uid = parse_uuid(resource_id, "resource_id")
    result = await db.execute(select(Resource).where(Resource.id == uid))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    await db.delete(resource)
    await db.commit()
