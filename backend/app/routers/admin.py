from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.team import Team, TeamMember
from app.models.task import Task
from app.models.sprint import Sprint
from app.core.deps import get_current_admin
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class TeamSummary(BaseModel):
    id: int
    name: str
    member_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class StatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_teams: int
    total_tasks: int
    active_sprints: int


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    active_users = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar()
    total_teams = (await db.execute(select(func.count()).select_from(Team))).scalar()
    total_tasks = (await db.execute(select(func.count()).select_from(Task))).scalar()
    active_sprints = (await db.execute(select(func.count()).select_from(Sprint).where(Sprint.status == "active"))).scalar()

    return StatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_teams=total_teams,
        total_tasks=total_tasks,
        active_sprints=active_sprints,
    )


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if data.role is not None:
        if data.role not in ("admin", "user"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        # Prevent removing your own admin role
        if user.id == current_admin.id and data.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own admin role")
        user.role = data.role

    if data.is_active is not None:
        if user.id == current_admin.id and not data.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
        user.is_active = data.is_active

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/teams", response_model=list[TeamSummary])
async def list_all_teams(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(Team).order_by(Team.created_at))
    teams = result.scalars().all()

    summaries = []
    for team in teams:
        count_result = await db.execute(
            select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team.id)
        )
        member_count = count_result.scalar()
        summaries.append(TeamSummary(id=team.id, name=team.name, member_count=member_count, created_at=team.created_at))

    return summaries


@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await db.delete(team)
    await db.commit()
