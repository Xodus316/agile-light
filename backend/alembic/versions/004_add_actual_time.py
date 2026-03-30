"""add actual time fields to tasks

Revision ID: 004
Revises: 003
Create Date: 2024-01-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reuse the existing estimateunit enum type
    op.add_column("tasks", sa.Column("actual", sa.Float(), nullable=True))
    op.add_column(
        "tasks",
        sa.Column(
            "actual_unit",
            sa.Enum("hours", "days", name="estimateunit", create_type=False),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("tasks", "actual_unit")
    op.drop_column("tasks", "actual")
