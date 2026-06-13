"""add ai_explanations.openai_fallback and notes.created_at

Revision ID: 002
Revises: 001
Create Date: 2026-06-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_explanations",
        sa.Column("openai_fallback", sa.Boolean, nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "notes",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_column("notes", "created_at")
    op.drop_column("ai_explanations", "openai_fallback")
