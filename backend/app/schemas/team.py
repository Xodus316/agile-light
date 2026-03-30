from datetime import datetime
from pydantic import BaseModel, EmailStr


class TeamCreate(BaseModel):
    name: str


class TeamMemberResponse(BaseModel):
    id: int
    user_id: int
    email: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}


class TeamResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    project_count: int = 0

    model_config = {"from_attributes": True}


class TeamDetailResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    members: list[TeamMemberResponse] = []

    model_config = {"from_attributes": True}


class AddMemberRequest(BaseModel):
    email: EmailStr
