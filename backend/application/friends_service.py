from typing import Any

import psycopg
from psycopg import errors as pg_errors

from application.notifications_service import NotificationsService
from infrastructure.persistence.postgres_friends_repository import PostgresFriendsRepository


class FriendshipError(ValueError):
    """Erro de regra de amizade."""


class FriendsService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        repo: PostgresFriendsRepository,
        notifications: NotificationsService,
    ) -> None:
        self._conn = conn
        self._repo = repo
        self._notifications = notifications

    def search_users(self, current_user_id: str, q: str) -> list[dict[str, Any]]:
        return self._repo.search_users(current_user_id, q)

    def list_friends(self, user_id: str) -> list[dict[str, Any]]:
        return self._repo.list_friends(user_id)

    def list_requests(self, user_id: str) -> list[dict[str, Any]]:
        return self._repo.list_requests(user_id)

    def request_friendship(self, requester_id: str, addressee_id: str, requester_name: str) -> dict[str, Any]:
        if requester_id == addressee_id:
            raise FriendshipError("Você não pode adicionar a si mesmo.")
        existing = self._repo.get_friendship_between(requester_id, addressee_id)
        if existing and existing["status"] in ("pending", "accepted", "blocked"):
            raise FriendshipError("Já existe uma relação de amizade ou pedido pendente com este usuário.")
        if existing and existing["status"] == "declined":
            row = self._repo.update_request_status(existing["id"], requester_id, "pending")
            if not row:
                raise FriendshipError("Não foi possível reenviar o pedido.")
        else:
            try:
                row = self._repo.create_request(requester_id, addressee_id)
            except pg_errors.UniqueViolation as exc:
                raise FriendshipError("Já existe uma relação com este usuário.") from exc

        self._notifications.notify(
            user_id=addressee_id,
            actor_user_id=requester_id,
            kind="friend_request",
            title="Novo pedido de amizade",
            body=f"{requester_name} quer adicionar você como amigo.",
            payload={"friendship_id": row["id"]},
            related_entity_type="friendship",
            related_entity_id=row["id"],
        )
        self._conn.commit()
        return row

    def respond_request(self, user_id: str, friendship_id: str, action: str) -> dict[str, Any] | None:
        current = next((r for r in self._repo.list_requests(user_id) if r["id"] == friendship_id), None)
        if not current:
            return None
        if action in ("accept", "decline") and current["addressee_id"] != user_id:
            raise FriendshipError("Apenas quem recebeu o pedido pode responder.")
        if action == "accept":
            row = self._repo.update_request_status(friendship_id, user_id, "accepted")
            if row:
                self._repo.ensure_default_permissions(row["id"], row["requester_id"], row["addressee_id"])
        elif action == "decline":
            row = self._repo.update_request_status(friendship_id, user_id, "declined")
        elif action == "block":
            row = self._repo.update_request_status(friendship_id, user_id, "blocked")
        else:
            raise FriendshipError("Ação inválida.")
        self._conn.commit()
        return row

    def delete_friendship(self, user_id: str, friendship_id: str) -> bool:
        ok = self._repo.delete_friendship(user_id, friendship_id)
        self._conn.commit()
        return ok

    def update_permissions(
        self,
        user_id: str,
        friendship_id: str,
        *,
        can_view_calendar: bool | None,
        can_request_calendar_events: bool | None,
        can_create_calendar_events_direct: bool | None,
    ) -> dict[str, Any] | None:
        row = self._repo.update_permissions(
            user_id,
            friendship_id,
            can_view_calendar=can_view_calendar,
            can_request_calendar_events=can_request_calendar_events,
            can_create_calendar_events_direct=can_create_calendar_events_direct,
        )
        self._conn.commit()
        return row
