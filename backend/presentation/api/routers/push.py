from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from application.push_service import PushNotConfiguredError, PushService
from presentation.api.dependencies import (
    CurrentUserDep,
    SettingsDep,
    get_push_service,
)
from presentation.api.schemas.push import (
    PushSubscribeRequest,
    PushSubscribeResponse,
    PushTestResponse,
    PushUnsubscribeRequest,
    VapidPublicKeyResponse,
)

router = APIRouter(prefix="/push", tags=["push"])

PushServiceDep = Annotated[PushService, Depends(get_push_service)]


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
def get_vapid_public_key(settings: SettingsDep):
    if not settings.vapid_public_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web Push não configurado no servidor.",
        )
    return VapidPublicKeyResponse(public_key=settings.vapid_public_key)


@router.post(
    "/subscribe",
    response_model=PushSubscribeResponse,
    status_code=status.HTTP_201_CREATED,
)
def subscribe_push(
    payload: PushSubscribeRequest,
    current_user: CurrentUserDep,
    push_service: PushServiceDep,
):
    try:
        push_service.register_subscription(
            str(current_user["id"]),
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=payload.user_agent,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return PushSubscribeResponse(endpoint=payload.endpoint, registered=True)


@router.delete("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe_push(
    payload: PushUnsubscribeRequest,
    current_user: CurrentUserDep,
    push_service: PushServiceDep,
):
    push_service.unregister_subscription(str(current_user["id"]), payload.endpoint)
    return None


@router.post("/test", response_model=PushTestResponse)
def send_push_test(
    current_user: CurrentUserDep,
    push_service: PushServiceDep,
):
    try:
        delivered = push_service.deliver_test(str(current_user["id"]))
    except PushNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return PushTestResponse(delivered=delivered)
