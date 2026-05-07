from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from application.settings_service import SettingsService
from presentation.api.dependencies import CurrentUserDep, get_settings_service
from presentation.api.schemas.settings import (
    IntegrationConnectionResponse,
    IntegrationStatusPatch,
    NotificationPreferencesPatch,
    NotificationPreferencesResponse,
    SettingsAggregateResponse,
    SettingsUiPatch,
    UiPrefs,
)

router = APIRouter(prefix="/settings", tags=["settings"])

SettingsServiceDep = Annotated[SettingsService, Depends(get_settings_service)]


def _aggregate(data: dict) -> SettingsAggregateResponse:
    return SettingsAggregateResponse(
        ui=UiPrefs(**data["ui"]),
        notifications=NotificationPreferencesResponse(**data["notifications"]),
        integrations=[IntegrationConnectionResponse(**row) for row in data["integrations"]],
    )


@router.get("", response_model=SettingsAggregateResponse)
def get_settings(current_user: CurrentUserDep, svc: SettingsServiceDep):
    try:
        data = svc.get_settings(str(current_user["id"]))
        return _aggregate(data)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.patch("/ui", response_model=UiPrefs)
def patch_ui(
    payload: SettingsUiPatch,
    current_user: CurrentUserDep,
    svc: SettingsServiceDep,
):
    try:
        row = svc.patch_ui(
            str(current_user["id"]),
            theme_mode=payload.theme_mode,
            assistant_voice=payload.assistant_voice,
        )
        return UiPrefs(**row)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/notifications", response_model=NotificationPreferencesResponse)
def patch_notifications(
    payload: NotificationPreferencesPatch,
    current_user: CurrentUserDep,
    svc: SettingsServiceDep,
):
    patch_dict = payload.model_dump(exclude_none=True)
    try:
        row = svc.patch_notifications(str(current_user["id"]), patch_dict)
        return NotificationPreferencesResponse(**row)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/integrations/{provider}", response_model=IntegrationConnectionResponse)
def patch_integration(
    provider: str,
    payload: IntegrationStatusPatch,
    current_user: CurrentUserDep,
    svc: SettingsServiceDep,
):
    try:
        row = svc.patch_integration(str(current_user["id"]), provider, payload.status)
        return IntegrationConnectionResponse(**row)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
