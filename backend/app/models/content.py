import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_nodes.id"), nullable=False, index=True)
    content = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "node_id", name="uq_user_note_node"),
    )


class Bookmark(Base):
    __tablename__ = "bookmarks"

    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), primary_key=True)
    node_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_nodes.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIExplanation(Base):
    __tablename__ = "ai_explanations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_nodes.id"), nullable=False, index=True)
    prompt_type = Column(String(50), nullable=False)
    response_text = Column(Text, nullable=False)
    model_used = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("node_id", "prompt_type", name="uq_ai_explanation_node_type"),
    )
