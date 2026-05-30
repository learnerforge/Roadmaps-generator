from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class RoadmapCreate(BaseModel):
    title: str
    slug: str
    description: str
    category: str
    difficulty: str = "beginner"
    estimated_hours: Optional[int] = None
    cover_image_url: Optional[str] = None


class RoadmapUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_hours: Optional[int] = None
    cover_image_url: Optional[str] = None
    is_published: Optional[bool] = None


class RoadmapRead(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str
    category: str
    difficulty: str
    estimated_hours: Optional[int]
    cover_image_url: Optional[str]
    is_published: bool
    created_at: datetime
    node_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class NodeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    why_important: Optional[str] = None
    category: Optional[str] = None
    source_node_id: Optional[str] = None
    node_type: str = "topic"
    order_index: int = 0
    is_optional: bool = False
    difficulty: str = "beginner"
    estimated_hours: int = 2
    position_x: float = 0
    position_y: float = 0
    width: Optional[float] = None
    height: Optional[float] = None


class NodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    why_important: Optional[str] = None
    category: Optional[str] = None
    source_node_id: Optional[str] = None
    node_type: Optional[str] = None
    order_index: Optional[int] = None
    is_optional: Optional[bool] = None
    difficulty: Optional[str] = None
    estimated_hours: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None


class NodeRead(BaseModel):
    id: UUID
    roadmap_id: UUID
    title: str
    description: Optional[str]
    why_important: Optional[str]
    category: Optional[str]
    source_node_id: Optional[str]
    node_type: str
    position_x: float
    position_y: float
    width: Optional[float]
    height: Optional[float]
    order_index: int
    is_optional: bool
    difficulty: str
    estimated_hours: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NodeWithStatus(NodeRead):
    status: str = "pending"
    is_bookmarked: bool = False


class ResourceCreate(BaseModel):
    title: str
    url: str
    type: str
    is_free: bool = True
    is_recommended: bool = False


class ResourceRead(BaseModel):
    id: UUID
    node_id: UUID
    title: str
    url: str
    type: str
    is_free: bool
    is_recommended: bool

    model_config = ConfigDict(from_attributes=True)
