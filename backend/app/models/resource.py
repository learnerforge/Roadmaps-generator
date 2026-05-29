import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    url = Column(Text, nullable=False)
    type = Column(String(20), nullable=False)
    is_free = Column(Boolean, default=True)
    is_recommended = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
