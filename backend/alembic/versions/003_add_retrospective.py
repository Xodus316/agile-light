"""add sprint retrospective table

Revision ID: 003
Revises: 002
Create Date: 2024-01-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sprint_retrospectives",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sprint_id", sa.Integer(), nullable=False),
        sa.Column("went_well", sa.Text(), nullable=True),
        sa.Column("improvements", sa.Text(), nullable=True),
        sa.Column("action_items", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["sprint_id"], ["sprints.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sprint_id", name="uq_retro_sprint"),
    )
    op.create_index(op.f("ix_sprint_retrospectives_id"), "sprint_retrospectives", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sprint_retrospectives_id"), table_name="sprint_retrospectives")
    op.drop_table("sprint_retrospectives")
