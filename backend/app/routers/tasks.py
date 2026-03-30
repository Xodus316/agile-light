from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.team import TeamMember
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.task import Task
from app.core.deps import get_current_user
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, BacklogProject

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


async def load_task_with_relations(task_id: int, db: AsyncSession) -> Task | None:
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee), selectinload(Task.project))
        .where(Task.id == task_id)
    )
    return result.scalar_one_or_none()


async def verify_project_access(project_id: int, user_id: int, db: AsyncSession) -> Project:
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == project.team_id, TeamMember.user_id == user_id
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    return project


@router.get("/backlog", response_model=list[BacklogProject])
async def get_backlog(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == current_user.id
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    projects_result = await db.execute(
        select(Project).where(Project.team_id == team_id)
    )
    projects = projects_result.scalars().all()

    backlog = []
    for project in projects:
        tasks_result = await db.execute(
            select(Task)
            .options(selectinload(Task.assignee), selectinload(Task.project))
            .where(Task.project_id == project.id, Task.sprint_id.is_(None))
        )
        tasks = tasks_result.scalars().all()
        backlog.append(
            BacklogProject(
                project_id=project.id,
                project_name=project.name,
                tasks=tasks,
            )
        )
    return backlog


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    project_id: int | None = None,
    sprint_id: int | None = None,
    assignee_id: int | None = None,
    priority: str | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).options(selectinload(Task.assignee), selectinload(Task.project))

    if project_id is not None:
        project = await verify_project_access(project_id, current_user.id, db)
        query = query.where(Task.project_id == project_id)

    if sprint_id is not None:
        sprint_result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
        sprint = sprint_result.scalar_one_or_none()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == sprint.team_id,
                TeamMember.user_id == current_user.id,
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not a member of this team")
        query = query.where(Task.sprint_id == sprint_id)

    if assignee_id is not None:
        query = query.where(Task.assignee_id == assignee_id)

    if priority is not None:
        query = query.where(Task.priority == priority)

    if status is not None:
        query = query.where(Task.status == status)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_access(data.project_id, current_user.id, db)

    task = Task(
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        due_date=data.due_date,
        assignee_id=data.assignee_id,
        project_id=data.project_id,
        sprint_id=data.sprint_id,
        estimate=data.estimate,
        estimate_unit=data.estimate_unit,
    )
    db.add(task)
    await db.commit()

    full_task = await load_task_with_relations(task.id, db)
    return full_task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await load_task_with_relations(task_id, db)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user.id, db)
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user.id, db)

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.status is not None:
        task.status = data.status
    if data.priority is not None:
        task.priority = data.priority
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.clear_assignee:
        task.assignee_id = None
    elif data.assignee_id is not None:
        task.assignee_id = data.assignee_id
    if data.clear_sprint:
        task.sprint_id = None
    elif data.sprint_id is not None:
        task.sprint_id = data.sprint_id
    if data.clear_estimate:
        task.estimate = None
        task.estimate_unit = None
    else:
        if data.estimate is not None:
            task.estimate = data.estimate
        if data.estimate_unit is not None:
            task.estimate_unit = data.estimate_unit

    await db.commit()

    full_task = await load_task_with_relations(task_id, db)
    return full_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user.id, db)

    await db.delete(task)
    await db.commit()
