from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class NodeProgressUpdate(BaseModel):
    status: str


class DashboardSummary(BaseModel):
    active_roadmaps: int
    total_nodes_completed: int
    streak_days: int
    recent_activity: list


class AIExplainRequest(BaseModel):
    node_id: UUID


class AIWeeklyPlanRequest(BaseModel):
    roadmap_id: UUID
    hours_available: int = 10


class AIQuizRequest(BaseModel):
    node_id: UUID
    count: int = 5


class AIProjectRequest(BaseModel):
    roadmap_id: UUID
    completed_node_ids: List[UUID]


class FeedbackCreate(BaseModel):
    node_id: Optional[UUID] = None
    type: str = "general"
    content: str


class FeedbackRead(BaseModel):
    id: UUID
    user_id: UUID
    node_id: Optional[UUID]
    type: str
    content: str
    status: str
    created_at: str

    class Config:
        from_attributes = True
