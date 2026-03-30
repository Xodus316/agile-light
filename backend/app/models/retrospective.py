from datetime import datetime, timezone
from sqlalchemy import Text, DateTime, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SprintRetrospective(Base):
    __tablename__ = "sprint_retrospectives"
    __table_args__ = (UniqueConstraint("sprint_id", name="uq_retro_sprint"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sprint_id: Mapped[int] = mapped_column(Integer, ForeignKey("sprints.id"), nullable=False)
    went_well: Mapped[str | None] = mapped_column(Text, nullable=True)
    improvements: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    sprint: Mapped["Sprint"] = relationship("Sprint", back_populates="retrospective")  # noqa: F821
