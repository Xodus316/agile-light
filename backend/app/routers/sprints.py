from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.team import TeamMember
from app.models.sprint import Sprint, SprintStatus
from app.models.task import Task
from app.core.deps import get_current_user
from app.schemas.sprint import SprintCreate, SprintUpdate, SprintResponse

router = APIRouter(prefix="/api/sprints", tags=["sprints"])


async def verify_team_membership(team_id: int, user_id: int, db: AsyncSession):
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")


async def build_sprint_response(sprint: Sprint, db: AsyncSession) -> SprintResponse:
    count_result = await db.execute(
        select(func.count(Task.id)).where(Task.sprint_id == sprint.id)
    )
    task_count = count_result.scalar() or 0
    return SprintResponse(
        id=sprint.id,
        name=sprint.name,
        goal=sprint.goal,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        status=sprint.status,
        team_id=sprint.team_id,
        created_at=sprint.created_at,
        task_count=task_count,
    )


@router.get("/", response_model=list[SprintResponse])
async def list_sprints(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_team_membership(team_id, current_user.id, db)

    result = await db.execute(select(Sprint).where(Sprint.team_id == team_id))
    sprints = result.scalars().all()

    return [await build_sprint_response(s, db) for s in sprints]


@router.post("/", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_team_membership(data.team_id, current_user.id, db)

    sprint = Sprint(
        name=data.name,
        goal=data.goal,
        start_date=data.start_date,
        end_date=data.end_date,
        team_id=data.team_id,
        status=SprintStatus.planned,
    )
    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return await build_sprint_response(sprint, db)


@router.get("/{sprint_id}", response_model=SprintResponse)
async def get_sprint(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    await verify_team_membership(sprint.team_id, current_user.id, db)
    return await build_sprint_response(sprint, db)


@router.put("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: int,
    data: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    await verify_team_membership(sprint.team_id, current_user.id, db)

    if data.name is not None:
        sprint.name = data.name
    if data.goal is not None:
        sprint.goal = data.goal
    if data.start_date is not None:
        sprint.start_date = data.start_date
    if data.end_date is not None:
        sprint.end_date = data.end_date

    await db.commit()
    await db.refresh(sprint)
    return await build_sprint_response(sprint, db)


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    await verify_team_membership(sprint.team_id, current_user.id, db)

    await db.delete(sprint)
    await db.commit()


@router.post("/{sprint_id}/start", response_model=SprintResponse)
async def start_sprint(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    await verify_team_membership(sprint.team_id, current_user.id, db)

    if sprint.status != SprintStatus.planned:
        raise HTTPException(status_code=400, detail="Only planned sprints can be started")

    active_result = await db.execute(
        select(Sprint).where(
            Sprint.team_id == sprint.team_id,
            Sprint.status == SprintStatus.active,
        )
    )
    active_sprint = active_result.scalar_one_or_none()
    if active_sprint:
        raise HTTPException(
            status_code=400,
            detail=f"Sprint '{active_sprint.name}' is already active for this team",
        )

    sprint.status = SprintStatus.active
    await db.commit()
    await db.refresh(sprint)
    return await build_sprint_response(sprint, db)


@router.post("/{sprint_id}/complete", response_model=SprintResponse)
async def complete_sprint(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    await verify_team_membership(sprint.team_id, current_user.id, db)

    if sprint.status != SprintStatus.active:
        raise HTTPException(status_code=400, detail="Only active sprints can be completed")

    sprint.status = SprintStatus.completed
    await db.commit()
    await db.refresh(sprint)
    return await build_sprint_response(sprint, db)
