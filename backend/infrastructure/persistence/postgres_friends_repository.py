from typing import Any

import psycopg


def _user_public(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["id"] = str(out["id"])
    return out


def _friendship_row(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    for key in ("id", "requester_id", "addressee_id", "friend_user_id"):
        if out.get(key) is not None:
            out[key] = str(out[key])
    return out


class PostgresFriendsRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def search_users(self, current_user_id: str, q: str, limit: int = 20) -> list[dict[str, Any]]:
        term = q.strip().lstrip("@")
        if len(term) < 3:
            return []
        like = f"%{term}%"
        nickname_exact = term.lower()
        search_by_email = "@" in term
        email_exact = term.lower() if search_by_email else ""

        base_from = """
                FROM users u
                LEFT JOIN friendships f
                  ON f.user_low_id = LEAST(u.id, %s::uuid)
                 AND f.user_high_id = GREATEST(u.id, %s::uuid)
                WHERE u.id <> %s::uuid
                  AND u.is_active = TRUE
        """
        base_params: tuple[Any, ...] = (current_user_id, current_user_id, current_user_id)

        if search_by_email:
            sql = f"""
                SELECT u.id, u.name, u.email, u.nickname,
                       f.id::text AS friendship_id,
                       f.status AS friendship_status
                {base_from}
                  AND (
                    lower(u.nickname) = %s
                    OR u.nickname ILIKE %s
                    OR lower(u.email) = %s
                  )
                ORDER BY
                  CASE WHEN lower(u.nickname) = %s THEN 0
                       WHEN u.nickname ILIKE %s THEN 1
                       WHEN lower(u.email) = %s THEN 2
                       ELSE 3 END,
                  lower(u.nickname)
                LIMIT %s
            """
            params = (
                *base_params,
                nickname_exact,
                like,
                email_exact,
                nickname_exact,
                like,
                email_exact,
                limit,
            )
        else:
            sql = f"""
                SELECT u.id, u.name, u.email, u.nickname,
                       f.id::text AS friendship_id,
                       f.status AS friendship_status
                {base_from}
                  AND (
                    lower(u.nickname) = %s
                    OR u.nickname ILIKE %s
                  )
                ORDER BY
                  CASE WHEN lower(u.nickname) = %s THEN 0
                       WHEN u.nickname ILIKE %s THEN 1
                       ELSE 2 END,
                  lower(u.nickname)
                LIMIT %s
            """
            params = (*base_params, nickname_exact, like, nickname_exact, like, limit)

        with self._conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
        return [_user_public(dict(r)) for r in rows]

    def get_friendship_between(self, user_a: str, user_b: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, requester_id, addressee_id, status, responded_at, created_at, updated_at
                FROM friendships
                WHERE user_low_id = LEAST(%s::uuid, %s::uuid)
                  AND user_high_id = GREATEST(%s::uuid, %s::uuid)
                """,
                (user_a, user_b, user_a, user_b),
            )
            row = cur.fetchone()
        return _friendship_row(dict(row)) if row else None

    def create_request(self, requester_id: str, addressee_id: str) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO friendships (requester_id, addressee_id, status)
                VALUES (%s::uuid, %s::uuid, 'pending')
                RETURNING id, requester_id, addressee_id, status, responded_at, created_at, updated_at
                """,
                (requester_id, addressee_id),
            )
            row = cur.fetchone()
        assert row is not None
        return _friendship_row(dict(row))

    def list_requests(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT f.id, f.requester_id, f.addressee_id, f.status, f.responded_at, f.created_at, f.updated_at,
                       requester.name AS requester_name, requester.email AS requester_email, requester.nickname AS requester_nickname,
                       addressee.name AS addressee_name, addressee.email AS addressee_email, addressee.nickname AS addressee_nickname
                FROM friendships f
                JOIN users requester ON requester.id = f.requester_id
                JOIN users addressee ON addressee.id = f.addressee_id
                WHERE f.addressee_id = %s::uuid
                  AND f.status = 'pending'
                ORDER BY f.created_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        return [_friendship_row(dict(r)) for r in rows]

    def update_request_status(self, friendship_id: str, user_id: str, status: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE friendships
                SET status = %s,
                    responded_at = CASE WHEN %s <> 'pending' THEN NOW() ELSE responded_at END
                WHERE id = %s::uuid
                  AND (requester_id = %s::uuid OR addressee_id = %s::uuid)
                RETURNING id, requester_id, addressee_id, status, responded_at, created_at, updated_at
                """,
                (status, status, friendship_id, user_id, user_id),
            )
            row = cur.fetchone()
        return _friendship_row(dict(row)) if row else None

    def ensure_default_permissions(self, friendship_id: str, requester_id: str, addressee_id: str) -> None:
        with self._conn.cursor() as cur:
            for owner, friend in ((requester_id, addressee_id), (addressee_id, requester_id)):
                cur.execute(
                    """
                    INSERT INTO friend_permissions (
                      friendship_id, owner_user_id, friend_user_id,
                      can_view_calendar, can_request_calendar_events, can_create_calendar_events_direct
                    )
                    VALUES (%s::uuid, %s::uuid, %s::uuid, TRUE, TRUE, FALSE)
                    ON CONFLICT (friendship_id, owner_user_id) DO NOTHING
                    """,
                    (friendship_id, owner, friend),
                )

    def list_friends(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at, f.updated_at,
                       other_user.id AS friend_user_id,
                       other_user.name AS friend_name,
                       other_user.email AS friend_email,
                       other_user.nickname AS friend_nickname,
                       fp.can_view_calendar,
                       fp.can_request_calendar_events,
                       fp.can_create_calendar_events_direct
                FROM friendships f
                JOIN users other_user
                  ON other_user.id = CASE
                    WHEN f.requester_id = %s::uuid THEN f.addressee_id
                    ELSE f.requester_id
                  END
                LEFT JOIN friend_permissions fp
                  ON fp.friendship_id = f.id
                 AND fp.owner_user_id = %s::uuid
                 AND fp.friend_user_id = other_user.id
                WHERE (f.requester_id = %s::uuid OR f.addressee_id = %s::uuid)
                  AND f.status = 'accepted'
                ORDER BY lower(other_user.name), lower(other_user.nickname)
                """,
                (user_id, user_id, user_id, user_id),
            )
            rows = cur.fetchall()
        return [_friendship_row(dict(r)) for r in rows]

    def delete_friendship(self, user_id: str, friendship_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM friendships
                WHERE id = %s::uuid
                  AND (requester_id = %s::uuid OR addressee_id = %s::uuid)
                RETURNING id
                """,
                (friendship_id, user_id, user_id),
            )
            return cur.fetchone() is not None

    def update_permissions(
        self,
        user_id: str,
        friendship_id: str,
        *,
        can_view_calendar: bool | None,
        can_request_calendar_events: bool | None,
        can_create_calendar_events_direct: bool | None,
    ) -> dict[str, Any] | None:
        fields: list[str] = []
        values: list[Any] = []
        if can_view_calendar is not None:
            fields.append("can_view_calendar = %s")
            values.append(can_view_calendar)
        if can_request_calendar_events is not None:
            fields.append("can_request_calendar_events = %s")
            values.append(can_request_calendar_events)
        if can_create_calendar_events_direct is not None:
            fields.append("can_create_calendar_events_direct = %s")
            values.append(can_create_calendar_events_direct)
        if not fields:
            return self.get_permissions_for_friendship(user_id, friendship_id)
        fields.append("updated_at = NOW()")
        values.extend([friendship_id, user_id])
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE friend_permissions
                SET {", ".join(fields)}
                WHERE friendship_id = %s::uuid AND owner_user_id = %s::uuid
                RETURNING id::text, friendship_id::text, owner_user_id::text, friend_user_id::text,
                          can_view_calendar, can_request_calendar_events, can_create_calendar_events_direct,
                          created_at, updated_at
                """,
                tuple(values),
            )
            row = cur.fetchone()
        return dict(row) if row else None

    def get_permissions_for_friendship(self, user_id: str, friendship_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text, friendship_id::text, owner_user_id::text, friend_user_id::text,
                       can_view_calendar, can_request_calendar_events, can_create_calendar_events_direct,
                       created_at, updated_at
                FROM friend_permissions
                WHERE friendship_id = %s::uuid AND owner_user_id = %s::uuid
                """,
                (friendship_id, user_id),
            )
            row = cur.fetchone()
        return dict(row) if row else None

    def get_permissions_between(self, owner_user_id: str, friend_user_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT fp.id::text, fp.friendship_id::text, fp.owner_user_id::text, fp.friend_user_id::text,
                       fp.can_view_calendar, fp.can_request_calendar_events, fp.can_create_calendar_events_direct,
                       fp.created_at, fp.updated_at
                FROM friend_permissions fp
                JOIN friendships f ON f.id = fp.friendship_id
                WHERE fp.owner_user_id = %s::uuid
                  AND fp.friend_user_id = %s::uuid
                  AND f.status = 'accepted'
                """,
                (owner_user_id, friend_user_id),
            )
            row = cur.fetchone()
        return dict(row) if row else None

    def are_accepted_friends(self, user_a: str, user_b: str) -> bool:
        row = self.get_friendship_between(user_a, user_b)
        return bool(row and row.get("status") == "accepted")
