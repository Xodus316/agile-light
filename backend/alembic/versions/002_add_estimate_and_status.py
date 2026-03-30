"""add estimate fields and expand task status

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new values to taskstatus enum.
    # In PostgreSQL 12+ this can run inside a transaction.
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'testing' AFTER 'in_progress'")
    op.execute("ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'ready_for_production' AFTER 'testing'")

    # Create estimate unit enum and add estimate columns
    estimateunit = sa.Enum("hours", "days", name="estimateunit")
    estimateunit.create(op.get_bind(), checkfirst=True)

    op.add_column("tasks", sa.Column("estimate", sa.Float(), nullable=True))
    op.add_column(
        "tasks",
        sa.Column(
            "estimate_unit",
            sa.Enum("hours", "days", name="estimateunit", create_type=False),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("tasks", "estimate_unit")
    op.drop_column("tasks", "estimate")
    op.execute("DROP TYPE IF EXISTS estimateunit")
    # Note: removing values from a PostgreSQL enum is not directly supported.
    # A full downgrade would require recreating the taskstatus enum without the new values.
