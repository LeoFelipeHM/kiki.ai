from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CalendarGuestInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)


class CalendarGuestResponse(BaseModel):
    id: str
    name: str
    email: str | None


class CalendarEventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    starts_at: datetime
    ends_at: datetime
    event_type: Literal["meeting", "task", "personal"]
    color: str | None = Field(default=None, max_length=64)
    description: str | None = None
    status: str = Field(default="confirmed", max_length=64)
    guests: list[CalendarGuestInput] = Field(default_factory=list)


class CalendarEventPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    event_type: Literal["meeting", "task", "personal"] | None = None
    color: str | None = Field(default=None, max_length=64)
    description: str | None = None
    status: str | None = Field(default=None, max_length=64)
    guests: list[CalendarGuestInput] | None = None


class CalendarEventResponse(BaseModel):
    id: str
    user_id: str
    title: str
    starts_at: datetime
    ends_at: datetime
    event_type: str
    color: str | None
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    guests: list[CalendarGuestResponse]
