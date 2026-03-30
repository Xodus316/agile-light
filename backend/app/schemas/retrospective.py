from datetime import datetime
from pydantic import BaseModel


class RetrospectiveUpsert(BaseModel):
    went_well: str | None = None
    improvements: str | None = None
    action_items: str | None = None


class RetrospectiveResponse(BaseModel):
    id: int
    sprint_id: int
    went_well: str | None
    improvements: str | None
    action_items: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
