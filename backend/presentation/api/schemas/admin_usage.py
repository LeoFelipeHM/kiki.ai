from datetime import datetime

from pydantic import BaseModel, Field


class UsageTotals(BaseModel):
    """accesses = logins + renovações de sessão (token refresh). events_created = agenda (calendar_events)."""

    accesses: int = Field(ge=0)
    chat_completion: int = Field(ge=0)
    voice_session: int = Field(ge=0)
    events_created: int = Field(ge=0)


class UsageUserRow(BaseModel):
    user_id: str
    name: str
    email: str
    accesses: int = Field(ge=0)
    chat_completion: int = Field(ge=0)
    voice_session: int = Field(ge=0)
    events_created: int = Field(ge=0)


class UsageSummaryResponse(BaseModel):
    period_from: datetime
    period_to: datetime
    totals: UsageTotals
    users: list[UsageUserRow]


class UsageTimeseriesRow(BaseModel):
    day: str
    accesses: int = Field(ge=0)
    chat_completion: int = Field(ge=0)
    voice_session: int = Field(ge=0)
    events_created: int = Field(ge=0)


class UsageTimeseriesResponse(BaseModel):
    period_from: datetime
    period_to: datetime
    series: list[UsageTimeseriesRow]
