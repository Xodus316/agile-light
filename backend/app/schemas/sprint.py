from datetime import datetime, date
from pydantic import BaseModel


class SprintCreate(BaseModel):
    name: str
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    team_id: int


class SprintUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class SprintResponse(BaseModel):
    id: int
    name: str
    goal: str | None
    start_date: date | None
    end_date: date | None
    status: str
    team_id: int
    created_at: datetime
    task_count: int = 0

    model_config = {"from_attributes": True}
