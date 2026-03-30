from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.team import Team, TeamMember, TeamRole
from app.models.project import Project
from app.core.deps import get_current_user
from app.schemas.team import (
    TeamCreate,
    TeamResponse,
    TeamDetailResponse,
    TeamMemberResponse,
    AddMemberRequest,
)

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("/", response_model=list[TeamResponse])
async def list_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
    )
    teams = result.scalars().all()

    team_responses = []
    for team in teams:
        count_result = await db.execute(
            select(func.count(Project.id)).where(Project.team_id == team.id)
        )
        project_count = count_result.scalar() or 0
        team_responses.append(
            TeamResponse(
                id=team.id,
                name=team.name,
                created_at=team.created_at,
                project_count=project_count,
            )
        )
    return team_responses


@router.post("/", response_model=TeamDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team = Team(name=data.name)
    db.add(team)
    await db.flush()

    membership = TeamMember(team_id=team.id, user_id=current_user.id, role=TeamRole.owner)
    db.add(membership)
    await db.commit()
    await db.refresh(team)

    members = [
        TeamMemberResponse(
            id=membership.id,
            user_id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            role=TeamRole.owner,
        )
    ]
    return TeamDetailResponse(
        id=team.id,
        name=team.name,
        created_at=team.created_at,
        members=members,
    )


@router.get("/{team_id}", response_model=TeamDetailResponse)
async def get_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    membership_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == current_user.id
        )
    )
    if not membership_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    members_result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .where(TeamMember.team_id == team_id)
    )
    members = [
        TeamMemberResponse(
            id=tm.id,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=tm.role,
        )
        for tm, user in members_result.all()
    ]

    return TeamDetailResponse(
        id=team.id,
        name=team.name,
        created_at=team.created_at,
        members=members,
    )


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    team_id: int,
    data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    owner_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == current_user.id,
            TeamMember.role == TeamRole.owner,
        )
    )
    if not owner_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only team owners can add members")

    user_result = await db.execute(select(User).where(User.email == data.email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing_result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == user.id
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member")

    membership = TeamMember(team_id=team_id, user_id=user.id, role=TeamRole.member)
    db.add(membership)
    await db.commit()
    await db.refresh(membership)

    return TeamMemberResponse(
        id=membership.id,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=TeamRole.member,
    )
