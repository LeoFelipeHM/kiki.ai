from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FriendUserResponse(BaseModel):
    id: str
    name: str
    email: str
    nickname: str
    friendship_id: str | None = None
    friendship_status: str | None = None


class FriendRequestCreate(BaseModel):
    user_id: str


class FriendRequestAction(BaseModel):
    action: Literal["accept", "decline", "block"]


class FriendRequestResponse(BaseModel):
    id: str
    requester_id: str
    addressee_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    responded_at: datetime | None = None
    requester_name: str | None = None
    requester_email: str | None = None
    requester_nickname: str | None = None
    addressee_name: str | None = None
    addressee_email: str | None = None
    addressee_nickname: str | None = None


class FriendPermissionsPatch(BaseModel):
    can_view_calendar: bool | None = None
    can_request_calendar_events: bool | None = None
    can_create_calendar_events_direct: bool | None = None


class FriendPermissionsResponse(BaseModel):
    id: str
    friendship_id: str
    owner_user_id: str
    friend_user_id: str
    can_view_calendar: bool
    can_request_calendar_events: bool
    can_create_calendar_events_direct: bool
    created_at: datetime
    updated_at: datetime


class FriendResponse(BaseModel):
    id: str
    requester_id: str
    addressee_id: str
    status: str
    friend_user_id: str
    friend_name: str
    friend_email: str
    friend_nickname: str
    can_view_calendar: bool = True
    can_request_calendar_events: bool = True
    can_create_calendar_events_direct: bool = False
    created_at: datetime
    updated_at: datetime


class FriendSearchQuery(BaseModel):
    q: str = Field(min_length=2, max_length=120)
