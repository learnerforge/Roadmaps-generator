"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("current_role", sa.String(100), nullable=True),
        sa.Column("target_role", sa.String(100), nullable=True),
        sa.Column("hours_per_week", sa.SmallInteger, default=10),
        sa.Column("experience_level", sa.String(20), default="beginner"),
        sa.Column("role", sa.String(20), default="user"),
        sa.Column("is_public", sa.Boolean, default=False),
        sa.Column("streak_days", sa.Integer, default=0),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "roadmaps",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("difficulty", sa.String(20), default="beginner"),
        sa.Column("estimated_hours", sa.Integer, nullable=True),
        sa.Column("cover_image_url", sa.Text, nullable=True),
        sa.Column("is_published", sa.Boolean, default=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "roadmap_nodes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("roadmap_id", UUID(as_uuid=True), sa.ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("source_node_id", sa.String(100), nullable=True, index=True),
        sa.Column("node_type", sa.String(20), default="topic"),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("why_important", sa.Text, nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("position_x", sa.Float, default=0),
        sa.Column("position_y", sa.Float, default=0),
        sa.Column("order_index", sa.Integer, nullable=False, default=0),
        sa.Column("width", sa.Float, nullable=True),
        sa.Column("height", sa.Float, nullable=True),
        sa.Column("is_optional", sa.Boolean, default=False),
        sa.Column("difficulty", sa.String(20), default="beginner"),
        sa.Column("estimated_hours", sa.SmallInteger, default=2),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "node_dependencies",
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("depends_on_node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "resources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("is_free", sa.Boolean, default=True),
        sa.Column("is_recommended", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "user_roadmaps",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("roadmap_id", UUID(as_uuid=True), sa.ForeignKey("roadmaps.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_pct", sa.Float, default=0.0),
        sa.Column("is_pinned", sa.Boolean, default=False),
    )

    op.create_table(
        "user_node_progress",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("roadmap_id", UUID(as_uuid=True), sa.ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, default="pending"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint("user_id", "node_id", name="uq_user_node"),
    )

    op.create_table(
        "notes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("content", sa.Text, nullable=False, default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint("user_id", "node_id", name="uq_user_note_node"),
    )

    op.create_table(
        "bookmarks",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "ai_explanations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("prompt_type", sa.String(50), nullable=False),
        sa.Column("response_text", sa.Text, nullable=False),
        sa.Column("model_used", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("node_id", "prompt_type", name="uq_ai_explanation_node_type"),
    )

    op.create_table(
        "quizzes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("options", JSONB, nullable=False),
        sa.Column("correct_answer", sa.String(10), nullable=False),
        sa.Column("explanation", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "quiz_attempts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("answers", JSONB, nullable=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "feedback",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("roadmap_nodes.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("type", sa.String(50), nullable=False, default="general"),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("feedback")
    op.drop_table("quiz_attempts")
    op.drop_table("quizzes")
    op.drop_table("ai_explanations")
    op.drop_table("bookmarks")
    op.drop_table("notes")
    op.drop_table("user_node_progress")
    op.drop_table("user_roadmaps")
    op.drop_table("resources")
    op.drop_table("node_dependencies")
    op.drop_table("roadmap_nodes")
    op.drop_table("roadmaps")
    op.drop_table("profiles")
