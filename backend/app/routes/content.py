from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import Profile
from app.models.roadmap import RoadmapNode
from app.models.feedback import Feedback
from app.models.content import Note, Bookmark
from app.utils.db_helpers import parse_uuid
from app.utils.pagination import PaginationParams
from app.schemas.progress import FeedbackCreate, FeedbackRead, NoteCreate, NoteRead, BookmarkToggleResponse

router = APIRouter()


@router.get("/feedback")
async def list_my_feedback(
    pagination: PaginationParams = Depends(),
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_q = select(func.count(Feedback.id)).where(Feedback.user_id == user.id)
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(
        select(Feedback).where(Feedback.user_id == user.id)
        .order_by(Feedback.created_at.desc())
        .offset(pagination.offset).limit(pagination.per_page)
    )
    items = result.scalars().all()
    return {
        "items": items,
        "total": total,
        "page": pagination.page,
        "per_page": pagination.per_page,
    }


@router.post("/feedback", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    data: FeedbackCreate,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.node_id:
        node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == data.node_id))
        if not node_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Node not found")
    feedback = Feedback(
        user_id=user.id,
        node_id=data.node_id,
        type=data.type,
        content=data.content,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.post("/nodes/{node_id}/bookmark", response_model=BookmarkToggleResponse)
async def toggle_bookmark(
    node_id: str,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(node_id, "node_id")
    node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == uid))
    if not node_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Node not found")

    result = await db.execute(
        select(Bookmark).where(
            Bookmark.user_id == user.id,
            Bookmark.node_id == uid,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return BookmarkToggleResponse(is_bookmarked=False)
    else:
        bookmark = Bookmark(user_id=user.id, node_id=uid)
        db.add(bookmark)
        await db.commit()
        return BookmarkToggleResponse(is_bookmarked=True)


@router.get("/nodes/{node_id}/notes", response_model=list[NoteRead])
async def list_notes(
    node_id: str,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(node_id, "node_id")
    result = await db.execute(
        select(Note).where(
            Note.user_id == user.id,
            Note.node_id == uid,
        )
    )
    return result.scalars().all()


@router.post("/nodes/{node_id}/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    node_id: str,
    data: NoteCreate,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(node_id, "node_id")
    node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == uid))
    if not node_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Node not found")
    note = Note(user_id=user.id, node_id=uid, content=data.content)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.put("/nodes/{node_id}/notes", response_model=NoteRead)
async def update_note(
    node_id: str,
    data: NoteCreate,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(node_id, "node_id")
    result = await db.execute(
        select(Note).where(
            Note.user_id == user.id,
            Note.node_id == uid,
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.content = data.content
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/nodes/{node_id}/notes", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    node_id: str,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = parse_uuid(node_id, "node_id")
    result = await db.execute(
        select(Note).where(
            Note.user_id == user.id,
            Note.node_id == uid,
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
