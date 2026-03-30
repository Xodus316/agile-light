from datetime import datetime, date
from pydantic import BaseModel


class AssigneeInfo(BaseModel):
    id: int
    full_name: str
    email: str

    model_config = {"from_attributes": True}


class ProjectInfo(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "medium"
    due_date: date | None = None
    assignee_id: int | None = None
    project_id: int
    sprint_id: int | None = None
    estimate: float | None = None
    estimate_unit: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    assignee_id: int | None = None
    sprint_id: int | None = None
    clear_sprint: bool = False
    clear_assignee: bool = False
    estimate: float | None = None
    estimate_unit: str | None = None
    clear_estimate: bool = False


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    priority: str
    due_date: date | None
    assignee_id: int | None
    project_id: int
    sprint_id: int | None
    estimate: float | None
    estimate_unit: str | None
    created_at: datetime
    assignee: AssigneeInfo | None = None
    project: ProjectInfo | None = None

    model_config = {"from_attributes": True}


class BacklogProject(BaseModel):
    project_id: int
    project_name: str
    tasks: list[TaskResponse]
