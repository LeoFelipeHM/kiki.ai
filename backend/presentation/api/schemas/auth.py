from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    nickname: str | None = Field(default=None, min_length=3, max_length=60)
    password: str = Field(min_length=1, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    nickname: str | None = Field(default=None, min_length=3, max_length=60)


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    nickname: str
    role: str
    is_active: bool
