from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from application.friends_service import FriendsService, FriendshipError
from presentation.api.dependencies import CurrentUserDep, get_friends_service
from presentation.api.schemas.friends import (
    FriendPermissionsPatch,
    FriendPermissionsResponse,
    FriendRequestAction,
    FriendRequestCreate,
    FriendRequestResponse,
    FriendResponse,
    FriendUserResponse,
)

router = APIRouter(prefix="/friends", tags=["friends"])

FriendsServiceDep = Annotated[FriendsService, Depends(get_friends_service)]


@router.get("/search", response_model=list[FriendUserResponse])
def search_users(
    current_user: CurrentUserDep,
    friends_service: FriendsServiceDep,
    q: Annotated[str, Query(min_length=3, max_length=120)],
):
    return friends_service.search_users(str(current_user["id"]), q)


@router.get("", response_model=list[FriendResponse])
def list_friends(current_user: CurrentUserDep, friends_service: FriendsServiceDep):
    return friends_service.list_friends(str(current_user["id"]))


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_friendship(
    friendship_id: str,
    current_user: CurrentUserDep,
    friends_service: FriendsServiceDep,
):
    if not friends_service.delete_friendship(str(current_user["id"]), friendship_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Amizade não encontrada.")
    return None


@router.patch("/{friendship_id}/permissions", response_model=FriendPermissionsResponse)
def update_friend_permissions(
    friendship_id: str,
    payload: FriendPermissionsPatch,
    current_user: CurrentUserDep,
    friends_service: FriendsServiceDep,
):
    row = friends_service.update_permissions(
        str(current_user["id"]),
        friendship_id,
        can_view_calendar=payload.can_view_calendar,
        can_request_calendar_events=payload.can_request_calendar_events,
        can_create_calendar_events_direct=payload.can_create_calendar_events_direct,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permissões não encontradas.")
    return FriendPermissionsResponse(**row)


@router.post("/requests", response_model=FriendRequestResponse, status_code=status.HTTP_201_CREATED)
def request_friendship(
    payload: FriendRequestCreate,
    current_user: CurrentUserDep,
    friends_service: FriendsServiceDep,
):
    try:
        row = friends_service.request_friendship(
            str(current_user["id"]),
            payload.user_id,
            str(current_user.get("name") or "Um usuário"),
        )
    except FriendshipError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return FriendRequestResponse(**row)


@router.get("/requests", response_model=list[FriendRequestResponse])
def list_friend_requests(current_user: CurrentUserDep, friends_service: FriendsServiceDep):
    return friends_service.list_requests(str(current_user["id"]))


@router.patch("/requests/{friendship_id}", response_model=FriendRequestResponse)
def respond_friend_request(
    friendship_id: str,
    payload: FriendRequestAction,
    current_user: CurrentUserDep,
    friends_service: FriendsServiceDep,
):
    try:
        row = friends_service.respond_request(str(current_user["id"]), friendship_id, payload.action)
    except FriendshipError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido de amizade não encontrado.")
    return FriendRequestResponse(**row)
