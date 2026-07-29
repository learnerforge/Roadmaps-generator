from typing import Literal, Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class NodeProgressUpdate(BaseModel):
    status: Literal["pending", "in_progress", "done", "skipped"]


class DashboardSummary(BaseModel):
    active_roadmaps: int
    total_nodes_completed: int
    streak_days: int
    recent_activity: list


class AIExplainRequest(BaseModel):
    node_id: UUID


class AIWeeklyPlanRequest(BaseModel):
    roadmap_id: UUID
    hours_available: int = Field(default=10, ge=1, le=168)


class AIQuizRequest(BaseModel):
    node_id: UUID
    count: int = Field(default=5, ge=1, le=20)


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
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoteCreate(BaseModel):
    content: str


class NoteRead(BaseModel):
    id: UUID
    user_id: UUID
    node_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookmarkToggleResponse(BaseModel):
    is_bookmarked: bool


class RoleUpdate(BaseModel):
    role: str


class FeedbackStatusUpdate(BaseModel):
    status: str

