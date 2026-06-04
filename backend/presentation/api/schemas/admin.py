from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class AdminUserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    nickname: str
    role: Literal["admin", "user"]
    is_active: bool
    created_at: datetime


class AdminCreateUserRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    nickname: str | None = Field(default=None, min_length=3, max_length=60)
    password: str = Field(min_length=1, max_length=128)
    role: Literal["admin", "user"] = "user"


class AdminUpdateUserRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    email: EmailStr | None = None
    nickname: str | None = Field(default=None, min_length=3, max_length=60)
    password: str | None = Field(default=None, min_length=1, max_length=128)
    role: Literal["admin", "user"] | None = None
    is_active: bool | None = None
