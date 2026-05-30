from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import Profile
from app.models.roadmap import Roadmap, RoadmapNode
from app.models.progress import UserNodeProgress
from app.models.content import AIExplanation
from app.services.ai_service import (
    explain_topic, simplify_topic, generate_quiz,
    suggest_projects, generate_weekly_plan,
)
from app.schemas.progress import (
    AIExplainRequest, AIWeeklyPlanRequest, AIQuizRequest, AIProjectRequest,
)

router = APIRouter()


@router.post("/explain-node")
async def explain_node(
    data: AIExplainRequest,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cached = await db.execute(
        select(AIExplanation).where(
            AIExplanation.node_id == data.node_id,
            AIExplanation.prompt_type == "explain",
        )
    )
    cached_result = cached.scalar_one_or_none()
    if cached_result:
        return {"explanation": cached_result.response_text, "cached": True}

    node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == data.node_id))
    node = node_result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    explanation = await explain_topic(
        topic_title=node.title,
        experience_level=user.experience_level,
        roadmap_title=node.category or "General",
    )

    ai_exp = AIExplanation(
        node_id=data.node_id,
        prompt_type="explain",
        response_text=explanation,
        model_used="gemini",
        openai_fallback=False,
    )
    db.add(ai_exp)
    await db.commit()

    return {"explanation": explanation, "cached": False}


@router.post("/simplify-node")
async def simplify_node(
    data: AIExplainRequest,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cached = await db.execute(
        select(AIExplanation).where(
            AIExplanation.node_id == data.node_id,
            AIExplanation.prompt_type == "simplify",
        )
    )
    cached_result = cached.scalar_one_or_none()
    if cached_result:
        return {"explanation": cached_result.response_text, "cached": True}

    node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == data.node_id))
    node = node_result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    result = await simplify_topic(topic_title=node.title)

    ai_exp = AIExplanation(
        node_id=data.node_id,
        prompt_type="simplify",
        response_text=result,
        model_used="gemini",
        openai_fallback=False,
    )
    db.add(ai_exp)
    await db.commit()

    return {"explanation": result, "cached": False}


@router.post("/generate-quiz")
async def gen_quiz(
    data: AIQuizRequest,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    node_result = await db.execute(select(RoadmapNode).where(RoadmapNode.id == data.node_id))
    node = node_result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    questions = await generate_quiz(
        topic_title=node.title,
        count=data.count,
        difficulty_level=node.difficulty or "beginner",
    )
    return {"questions": questions}


@router.post("/suggest-projects")
async def gen_projects(
    data: AIProjectRequest,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.roadmap import Roadmap
    rm_result = await db.execute(select(Roadmap).where(Roadmap.id == data.roadmap_id))
    roadmap = rm_result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    node_ids = data.completed_node_ids
    nodes_r = await db.execute(select(RoadmapNode).where(RoadmapNode.id.in_(node_ids)))
    topics = [n.title for n in nodes_r.scalars().all()]

    result = await suggest_projects(roadmap_title=roadmap.title, completed_topics=topics)
    return {"projects": result}


@router.post("/weekly-plan")
async def gen_weekly(
    data: AIWeeklyPlanRequest,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rm_result = await db.execute(select(Roadmap).where(Roadmap.id == data.roadmap_id))
    roadmap = rm_result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    all_nodes_r = await db.execute(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == data.roadmap_id)
    )
    all_nodes = all_nodes_r.scalars().all()

    done_r = await db.execute(
        select(RoadmapNode.title)
        .join(UserNodeProgress, RoadmapNode.id == UserNodeProgress.node_id)
        .where(
            UserNodeProgress.user_id == user.id,
            RoadmapNode.roadmap_id == data.roadmap_id,
            UserNodeProgress.status == "done",
        )
    )
    completed_titles = [row for row in done_r.scalars().all()]
    all_titles = [n.title for n in all_nodes]
    remaining_titles = [t for t in all_titles if t not in completed_titles]

    plan = await generate_weekly_plan(
        roadmap_title=roadmap.title,
        experience_level=user.experience_level,
        hours_per_week=data.hours_available,
        completed_nodes=completed_titles,
        remaining_nodes=remaining_titles,
    )
    return {"plan": plan}
