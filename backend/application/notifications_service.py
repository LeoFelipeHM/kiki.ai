from datetime import datetime
from typing import Any

import psycopg

from infrastructure.persistence.postgres_friends_repository import PostgresFriendsRepository
from infrastructure.persistence.postgres_notifications_repository import PostgresNotificationsRepository


class NotificationActionError(ValueError):
    """A notificação não aceita a ação solicitada."""


class NotificationsService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        repo: PostgresNotificationsRepository,
        friends_repo: PostgresFriendsRepository,
        push_service: Any | None = None,
    ) -> None:
        self._conn = conn
        self._repo = repo
        self._friends_repo = friends_repo
        self._push = push_service

    def _send_push(self, user_id: str, notification: dict[str, Any]) -> None:
        if self._push is None:
            return
        try:
            self._push.send_to_user(
                user_id,
                {
                    "kind": notification["kind"],
                    "title": notification["title"],
                    "body": notification.get("body") or "",
                    "tag": f"kiki:{notification['kind']}:{notification['id']}",
                    "url": "/notifications",
                },
            )
        except RuntimeError:
            return

    def notify(
        self,
        *,
        user_id: str,
        actor_user_id: str | None,
        kind: str,
        title: str,
        body: str,
        payload: dict[str, Any],
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
        status: str = "pending",
    ) -> dict[str, Any]:
        row = self._repo.create_notification(
            user_id=user_id,
            actor_user_id=actor_user_id,
            kind=kind,
            title=title,
            body=body,
            payload=payload,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            status=status,
        )
        self._send_push(user_id, row)
        return row

    def list_notifications(self, user_id: str, include_read: bool) -> list[dict[str, Any]]:
        return self._repo.list_for_user(user_id, include_read)

    def mark_read(self, user_id: str, notification_id: str) -> dict[str, Any] | None:
        row = self._repo.mark_read(user_id, notification_id)
        self._conn.commit()
        return row

    def act(self, user_id: str, notification_id: str, action: str) -> dict[str, Any] | None:
        notification = self._repo.get_for_user(user_id, notification_id)
        if not notification:
            return None
        if notification["status"] not in ("pending", "read"):
            raise NotificationActionError("Esta notificação já foi respondida.")
        if action not in ("accept", "decline"):
            raise NotificationActionError("Ação inválida.")

        kind = str(notification["kind"])
        payload = notification.get("payload") or {}

        if kind == "note_share":
            note_id = str(payload.get("note_id") or "")
            if not note_id:
                raise NotificationActionError("Convite de nota incompleto.")
            if action == "accept":
                self._repo.accept_note_invite(user_id, note_id)
            else:
                self._repo.decline_note_invite(user_id, note_id)
            row = self._repo.mark_actioned(user_id, notification_id)
            self._conn.commit()
            return row

        if kind == "calendar_event_request":
            if action == "accept":
                starts_at = datetime.fromisoformat(str(payload["starts_at"]).replace("Z", "+00:00"))
                ends_at = datetime.fromisoformat(str(payload["ends_at"]).replace("Z", "+00:00"))
                self._repo.create_calendar_event_from_request(
                    owner_user_id=user_id,
                    created_by_user_id=str(notification["actor_user_id"]),
                    notification_id=notification_id,
                    title=str(payload["title"]),
                    starts_at=starts_at,
                    ends_at=ends_at,
                    event_type=str(payload.get("event_type") or "personal"),
                    color=payload.get("color") if isinstance(payload.get("color"), str) else None,
                    description=payload.get("description") if isinstance(payload.get("description"), str) else None,
                    guests=payload.get("guests") if isinstance(payload.get("guests"), list) else [],
                )
            row = self._repo.mark_actioned(user_id, notification_id)
            self._conn.commit()
            return row

        if kind == "friend_request":
            friendship_id = str(payload.get("friendship_id") or notification.get("related_entity_id") or "")
            if not friendship_id:
                raise NotificationActionError("Pedido de amizade incompleto.")
            if action == "accept":
                friendship = self._repo.accept_friend_request(user_id, friendship_id)
                if friendship:
                    self._friends_repo.ensure_default_permissions(
                        friendship["id"],
                        friendship["requester_id"],
                        friendship["addressee_id"],
                    )
            else:
                self._repo.decline_friend_request(user_id, friendship_id)
            row = self._repo.mark_actioned(user_id, notification_id)
            self._conn.commit()
            return row

        raise NotificationActionError("Esta notificação não possui ação.")
