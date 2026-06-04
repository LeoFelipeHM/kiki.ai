from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from application.auth_service import AuthService
from application.errors import (
    AccountLockedError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    UserInactiveError,
)
from presentation.api.dependencies import CurrentUserDep, get_auth_service
from presentation.api.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, auth_service: AuthServiceDep):
    try:
        user = auth_service.register(payload.name, payload.email, payload.password, payload.nickname)
        return UserResponse(**user)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    auth_service: AuthServiceDep,
    user_agent: str | None = Header(default=None, alias="User-Agent"),
    x_forwarded_for: str | None = Header(default=None, alias="X-Forwarded-For"),
):
    ip_address = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else None
    try:
        tokens = auth_service.login(payload.email, payload.password, user_agent, ip_address)
        return TokenResponse(**tokens)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.detail) from exc
    except UserInactiveError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.detail) from exc
    except AccountLockedError as exc:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=exc.detail) from exc


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    payload: RefreshRequest,
    auth_service: AuthServiceDep,
    user_agent: str | None = Header(default=None, alias="User-Agent"),
    x_forwarded_for: str | None = Header(default=None, alias="X-Forwarded-For"),
):
    ip_address = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else None
    try:
        tokens = auth_service.refresh_session(payload.refresh_token, user_agent, ip_address)
        return TokenResponse(**tokens)
    except InvalidRefreshTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.detail) from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest, auth_service: AuthServiceDep):
    try:
        auth_service.logout(payload.refresh_token)
        return None
    except InvalidRefreshTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.detail) from exc


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUserDep):
    return UserResponse(**current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UpdateProfileRequest,
    current_user: CurrentUserDep,
    auth_service: AuthServiceDep,
):
    try:
        user = auth_service.update_profile(
            str(current_user["id"]),
            name=payload.name,
            nickname=payload.nickname,
        )
        return UserResponse(**user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUserDep,
    auth_service: AuthServiceDep,
):
    try:
        auth_service.change_password(
            str(current_user["id"]),
            payload.current_password,
            payload.new_password,
        )
        return None
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.detail) from exc
    except UserInactiveError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.detail) from exc
    except AccountLockedError as exc:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=exc.detail) from exc
