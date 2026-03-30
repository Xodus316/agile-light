from datetime import datetime, timezone, date
from sqlalchemy import String, Text, DateTime, Date, Integer, Float, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    testing = "testing"
    ready_for_production = "ready_for_production"
    done = "done"


class EstimateUnit(str, enum.Enum):
    hours = "hours"
    days = "days"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(TaskStatus, name="taskstatus"),
        default=TaskStatus.todo,
        nullable=False,
    )
    priority: Mapped[str] = mapped_column(
        Enum(TaskPriority, name="taskpriority"),
        default=TaskPriority.medium,
        nullable=False,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    estimate_unit: Mapped[str | None] = mapped_column(
        Enum(EstimateUnit, name="estimateunit"), nullable=True
    )
    actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    actual_unit: Mapped[str | None] = mapped_column(
        Enum(EstimateUnit, name="estimateunit", create_constraint=False), nullable=True
    )
    assignee_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    sprint_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sprints.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    assignee: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="assigned_tasks", foreign_keys=[assignee_id]
    )
    project: Mapped["Project"] = relationship("Project", back_populates="tasks")  # noqa: F821
    sprint: Mapped["Sprint | None"] = relationship("Sprint", back_populates="tasks")  # noqa: F821
