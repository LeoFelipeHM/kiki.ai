from datetime import datetime
from typing import Any

import psycopg
from psycopg.types.json import Jsonb


def _notification_row(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    for key in ("id", "user_id", "actor_user_id", "related_entity_id"):
        if out.get(key) is not None:
            out[key] = str(out[key])
    if out.get("payload") is None:
        out["payload"] = {}
    return out


class PostgresNotificationsRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def create_notification(
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
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO app_notifications (
                  user_id, actor_user_id, kind, status, title, body, payload,
                  related_entity_type, related_entity_id
                )
                VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s::uuid)
                RETURNING id, user_id, actor_user_id, kind, status, title, body, payload,
                          related_entity_type, related_entity_id, read_at, actioned_at,
                          created_at, updated_at
                """,
                (
                    user_id,
                    actor_user_id,
                    kind,
                    status,
                    title,
                    body,
                    Jsonb(payload),
                    related_entity_type,
                    related_entity_id,
                ),
            )
            row = cur.fetchone()
        assert row is not None
        return _notification_row(dict(row))

    def list_for_user(self, user_id: str, include_read: bool, limit: int = 50) -> list[dict[str, Any]]:
        status_clause = "" if include_read else "AND status = 'pending'"
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT n.id, n.user_id, n.actor_user_id, n.kind, n.status, n.title, n.body, n.payload,
                       n.related_entity_type, n.related_entity_id, n.read_at, n.actioned_at,
                       n.created_at, n.updated_at,
                       actor.name AS actor_name, actor.email AS actor_email, actor.nickname AS actor_nickname
                FROM app_notifications n
                LEFT JOIN users actor ON actor.id = n.actor_user_id
                WHERE n.user_id = %s::uuid
                {status_clause}
                ORDER BY n.created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()
        return [_notification_row(dict(r)) for r in rows]

    def get_for_user(self, user_id: str, notification_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, actor_user_id, kind, status, title, body, payload,
                       related_entity_type, related_entity_id, read_at, actioned_at,
                       created_at, updated_at
                FROM app_notifications
                WHERE id = %s::uuid AND user_id = %s::uuid
                """,
                (notification_id, user_id),
            )
            row = cur.fetchone()
        return _notification_row(dict(row)) if row else None

    def mark_read(self, user_id: str, notification_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE app_notifications
                SET status = CASE WHEN status = 'pending' THEN 'read' ELSE status END,
                    read_at = COALESCE(read_at, NOW())
                WHERE id = %s::uuid AND user_id = %s::uuid
                RETURNING id, user_id, actor_user_id, kind, status, title, body, payload,
                          related_entity_type, related_entity_id, read_at, actioned_at,
                          created_at, updated_at
                """,
                (notification_id, user_id),
            )
            row = cur.fetchone()
        return _notification_row(dict(row)) if row else None

    def mark_actioned(self, user_id: str, notification_id: str, *, status: str = "actioned") -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE app_notifications
                SET status = %s,
                    read_at = COALESCE(read_at, NOW()),
                    actioned_at = COALESCE(actioned_at, NOW())
                WHERE id = %s::uuid AND user_id = %s::uuid
                RETURNING id, user_id, actor_user_id, kind, status, title, body, payload,
                          related_entity_type, related_entity_id, read_at, actioned_at,
                          created_at, updated_at
                """,
                (status, notification_id, user_id),
            )
            row = cur.fetchone()
        return _notification_row(dict(row)) if row else None

    def accept_note_invite(self, user_id: str, note_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE note_collaborators
                SET accepted_at = COALESCE(accepted_at, NOW())
                WHERE note_id = %s::uuid AND user_id = %s::uuid AND accepted_at IS NULL
                RETURNING id
                """,
                (note_id, user_id),
            )
            return cur.fetchone() is not None

    def decline_note_invite(self, user_id: str, note_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM note_collaborators
                WHERE note_id = %s::uuid AND user_id = %s::uuid AND role <> 'owner'
                RETURNING id
                """,
                (note_id, user_id),
            )
            return cur.fetchone() is not None

    def create_calendar_event_from_request(
        self,
        *,
        owner_user_id: str,
        created_by_user_id: str,
        notification_id: str,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        event_type: str,
        color: str | None,
        description: str | None,
        guests: list[dict[str, Any]],
    ) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calendar_events (
                  user_id, title, starts_at, ends_at, event_type, color, description,
                  status, created_by_user_id, source_request_id
                )
                VALUES (%s::uuid, %s, %s, %s, %s::event_type, %s, %s, 'confirmed', %s::uuid, %s::uuid)
                RETURNING id::text, user_id::text, title, starts_at, ends_at, event_type::text AS event_type,
                          color, description, status, created_by_user_id::text, source_request_id::text,
                          created_at, updated_at
                """,
                (
                    owner_user_id,
                    title,
                    starts_at,
                    ends_at,
                    event_type,
                    color,
                    description,
                    created_by_user_id,
                    notification_id,
                ),
            )
            row = cur.fetchone()
            assert row is not None
            event_id = row["id"]
            for guest in guests:
                name = str(guest.get("name") or "").strip()
                if not name:
                    continue
                email = guest.get("email")
                cur.execute(
                    """
                    INSERT INTO calendar_event_guests (event_id, name, email)
                    VALUES (%s::uuid, %s, %s)
                    """,
                    (event_id, name, email if isinstance(email, str) and email.strip() else None),
                )
        out = dict(row)
        out["guests"] = guests
        return out

    def accept_friend_request(self, user_id: str, friendship_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE friendships
                SET status = 'accepted',
                    responded_at = NOW()
                WHERE id = %s::uuid AND addressee_id = %s::uuid AND status = 'pending'
                RETURNING id::text, requester_id::text, addressee_id::text, status
                """,
                (friendship_id, user_id),
            )
            row = cur.fetchone()
        return dict(row) if row else None

    def decline_friend_request(self, user_id: str, friendship_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE friendships
                SET status = 'declined',
                    responded_at = NOW()
                WHERE id = %s::uuid AND addressee_id = %s::uuid AND status = 'pending'
                RETURNING id::text, requester_id::text, addressee_id::text, status
                """,
                (friendship_id, user_id),
            )
            row = cur.fetchone()
        return dict(row) if row else None
