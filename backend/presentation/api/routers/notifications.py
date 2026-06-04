from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from application.notifications_service import NotificationActionError, NotificationsService
from presentation.api.dependencies import CurrentUserDep, get_notifications_service
from presentation.api.schemas.notifications import AppNotificationResponse, NotificationActionRequest

router = APIRouter(prefix="/notifications", tags=["notifications"])

NotificationsServiceDep = Annotated[NotificationsService, Depends(get_notifications_service)]


@router.get("", response_model=list[AppNotificationResponse])
def list_notifications(
    current_user: CurrentUserDep,
    notifications_service: NotificationsServiceDep,
    include_read: Annotated[bool, Query()] = True,
):
    rows = notifications_service.list_notifications(str(current_user["id"]), include_read)
    return [AppNotificationResponse(**row) for row in rows]


@router.patch("/{notification_id}/read", response_model=AppNotificationResponse)
def mark_notification_read(
    notification_id: str,
    current_user: CurrentUserDep,
    notifications_service: NotificationsServiceDep,
):
    row = notifications_service.mark_read(str(current_user["id"]), notification_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada.")
    return AppNotificationResponse(**row)


@router.patch("/{notification_id}/action", response_model=AppNotificationResponse)
def act_on_notification(
    notification_id: str,
    payload: NotificationActionRequest,
    current_user: CurrentUserDep,
    notifications_service: NotificationsServiceDep,
):
    try:
        row = notifications_service.act(str(current_user["id"]), notification_id, payload.action)
    except NotificationActionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada.")
    return AppNotificationResponse(**row)
