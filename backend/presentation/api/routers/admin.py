from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from application.admin_service import AdminService
from application.errors import (
    AdminDeleteSelfError,
    AdminEmailConflictError,
    AdminNoFieldsError,
    AdminSelfDeactivateError,
    AdminUserNotFoundError,
)
from presentation.api.dependencies import AdminUserDep, get_admin_service
from presentation.api.schemas.admin import AdminCreateUserRequest, AdminUpdateUserRequest, AdminUserResponse

router = APIRouter(prefix="/admin/users", tags=["admin"])

AdminServiceDep = Annotated[AdminService, Depends(get_admin_service)]


@router.get("", response_model=list[AdminUserResponse])
def admin_list_users(_admin: AdminUserDep, admin_service: AdminServiceDep):
    return [AdminUserResponse(**row) for row in admin_service.list_users()]


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(payload: AdminCreateUserRequest, _admin: AdminUserDep, admin_service: AdminServiceDep):
    try:
        row = admin_service.create_user(payload.name, payload.email, payload.password, payload.role)
        return AdminUserResponse(**row)
    except AdminEmailConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc


@router.patch("/{user_id}", response_model=AdminUserResponse)
def admin_update_user(
    user_id: str,
    payload: AdminUpdateUserRequest,
    current_admin: AdminUserDep,
    admin_service: AdminServiceDep,
):
    try:
        row = admin_service.update_user(
            user_id,
            current_admin_id=str(current_admin["id"]),
            name=payload.name,
            email=payload.email,
            password=payload.password,
            role=payload.role,
            is_active=payload.is_active,
        )
        return AdminUserResponse(**row)
    except AdminNoFieldsError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.detail) from exc
    except AdminEmailConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc
    except AdminUserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.detail) from exc
    except AdminSelfDeactivateError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.detail) from exc


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(user_id: str, current_admin: AdminUserDep, admin_service: AdminServiceDep):
    try:
        admin_service.delete_user(user_id, current_admin_id=str(current_admin["id"]))
        return None
    except AdminDeleteSelfError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.detail) from exc
    except AdminUserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.detail) from exc
