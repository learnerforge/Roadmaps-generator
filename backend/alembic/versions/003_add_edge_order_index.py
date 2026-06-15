"""add node_dependencies.order_index

Revision ID: 003
Revises: 002
Create Date: 2026-06-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "node_dependencies",
        sa.Column("order_index", sa.Integer, nullable=False, server_default=sa.text("0")),
    )


def downgrade() -> None:
    op.drop_column("node_dependencies", "order_index")
