from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class AppNotificationResponse(BaseModel):
    id: str
    user_id: str
    actor_user_id: str | None
    actor_name: str | None = None
    actor_email: str | None = None
    actor_nickname: str | None = None
    kind: str
    status: str
    title: str
    body: str
    payload: dict[str, Any]
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    read_at: datetime | None = None
    actioned_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class NotificationActionRequest(BaseModel):
    action: Literal["accept", "decline"]
