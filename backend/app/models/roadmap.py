import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, SmallInteger, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(150), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    difficulty = Column(String(20), default="beginner")
    estimated_hours = Column(Integer, nullable=True)
    cover_image_url = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RoadmapNode(Base):
    __tablename__ = "roadmap_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roadmap_id = Column(UUID(as_uuid=True), ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False, index=True)
    source_node_id = Column(String(255), nullable=True, index=True)
    node_type = Column(String(20), default="topic")
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    why_important = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    order_index = Column(Integer, nullable=False, default=0)
    width = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    is_optional = Column(Boolean, default=False)
    difficulty = Column(String(20), default="beginner")
    estimated_hours = Column(SmallInteger, default=2)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NodeDependency(Base):
    __tablename__ = "node_dependencies"

    node_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), primary_key=True)
    depends_on_node_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), primary_key=True)
