from datetime import datetime
from typing import Any

import psycopg


def _guest_row(g: dict[str, Any]) -> dict[str, Any]:
    return {"id": str(g["id"]), "name": g["name"], "email": g.get("email")}


def _normalize_event_row(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["id"] = str(out["id"])
    out["user_id"] = str(out["user_id"])
    if out.get("created_by_user_id") is not None:
        out["created_by_user_id"] = str(out["created_by_user_id"])
    if out.get("source_request_id") is not None:
        out["source_request_id"] = str(out["source_request_id"])
    out["event_type"] = str(out["event_type"])
    return out


class PostgresCalendarRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def _fetch_guests_for_events(self, event_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        if not event_ids:
            return {}
        placeholders = ", ".join(["%s::uuid"] * len(event_ids))
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, event_id, name, email
                FROM calendar_event_guests
                WHERE event_id IN ({placeholders})
                ORDER BY created_at ASC
                """,
                tuple(event_ids),
            )
            rows = cur.fetchall()
        by_event: dict[str, list[dict[str, Any]]] = {}
        for r in rows:
            eid = str(r["event_id"])
            by_event.setdefault(eid, []).append(_guest_row(r))
        return by_event

    def list_events(
        self,
        user_id: str,
        range_from: datetime | None,
        range_to: datetime | None,
    ) -> list[dict[str, Any]]:
        conditions = ["user_id = %s"]
        params: list[Any] = [user_id]

        if range_from is not None and range_to is not None:
            conditions.append("starts_at < %s AND ends_at > %s")
            params.extend([range_to, range_from])
        elif range_from is not None:
            conditions.append("ends_at > %s")
            params.append(range_from)
        elif range_to is not None:
            conditions.append("starts_at < %s")
            params.append(range_to)

        where_clause = " AND ".join(conditions)
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, title, starts_at, ends_at, event_type::text AS event_type,
                       color, description, status, created_by_user_id, source_request_id,
                       created_at, updated_at
                FROM calendar_events
                WHERE {where_clause}
                ORDER BY starts_at ASC
                """,
                tuple(params),
            )
            rows = cur.fetchall()

        ids = [str(r["id"]) for r in rows]
        guests_map = self._fetch_guests_for_events(ids)
        result = []
        for row in rows:
            er = _normalize_event_row(row)
            er["guests"] = guests_map.get(er["id"], [])
            result.append(er)
        return result

    def create_event(
        self,
        user_id: str,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        event_type: str,
        color: str | None,
        description: str | None,
        status: str,
        guests: list[tuple[str, str | None]],
        created_by_user_id: str | None = None,
        source_request_id: str | None = None,
    ) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calendar_events (
                  user_id, title, starts_at, ends_at, event_type, color, description, status,
                  created_by_user_id, source_request_id
                )
                VALUES (%s, %s, %s, %s, %s::event_type, %s, %s, %s, %s::uuid, %s::uuid)
                RETURNING id, user_id, title, starts_at, ends_at, event_type::text AS event_type,
                          color, description, status, created_by_user_id, source_request_id,
                          created_at, updated_at
                """,
                (
                    user_id,
                    title,
                    starts_at,
                    ends_at,
                    event_type,
                    color,
                    description,
                    status,
                    created_by_user_id,
                    source_request_id,
                ),
            )
            row = cur.fetchone()
            assert row is not None
            event_id = row["id"]
            for name, email in guests:
                cur.execute(
                    """
                    INSERT INTO calendar_event_guests (event_id, name, email)
                    VALUES (%s, %s, %s)
                    """,
                    (event_id, name, email),
                )
        created = self.get_event(user_id, str(row["id"]))
        assert created is not None
        return created

    def get_event(self, user_id: str, event_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, title, starts_at, ends_at, event_type::text AS event_type,
                       color, description, status, created_by_user_id, source_request_id,
                       created_at, updated_at
                FROM calendar_events
                WHERE user_id = %s AND id = %s::uuid
                """,
                (user_id, event_id),
            )
            row = cur.fetchone()
        if not row:
            return None
        er = _normalize_event_row(row)
        gm = self._fetch_guests_for_events([er["id"]])
        er["guests"] = gm.get(er["id"], [])
        return er

    def update_event(
        self,
        user_id: str,
        event_id: str,
        title: str | None,
        starts_at: datetime | None,
        ends_at: datetime | None,
        event_type: str | None,
        color: str | None,
        description: str | None,
        status: str | None,
        guests_replace: bool,
        guests: list[tuple[str, str | None]],
    ) -> dict[str, Any] | None:
        fields: list[str] = []
        values: list[Any] = []

        if title is not None:
            fields.append("title = %s")
            values.append(title)
        if starts_at is not None:
            fields.append("starts_at = %s")
            values.append(starts_at)
        if ends_at is not None:
            fields.append("ends_at = %s")
            values.append(ends_at)
        if event_type is not None:
            fields.append("event_type = %s::event_type")
            values.append(event_type)
        if color is not None:
            fields.append("color = %s")
            values.append(color)
        if description is not None:
            fields.append("description = %s")
            values.append(description)
        if status is not None:
            fields.append("status = %s")
            values.append(status)

        if not fields and not guests_replace:
            return self.get_event(user_id, event_id)

        with self._conn.cursor() as cur:
            if fields:
                fields.append("updated_at = NOW()")
                set_clause = ", ".join(fields)
                values.extend([user_id, event_id])
                cur.execute(
                    f"""
                    UPDATE calendar_events
                    SET {set_clause}
                    WHERE user_id = %s AND id = %s::uuid
                    RETURNING id, user_id, title, starts_at, ends_at, event_type::text AS event_type,
                              color, description, status, created_at, updated_at
                    """,
                    tuple(values),
                )
                row = cur.fetchone()
                if not row:
                    return None
            elif guests_replace:
                cur.execute(
                    "SELECT id FROM calendar_events WHERE user_id = %s AND id = %s::uuid",
                    (user_id, event_id),
                )
                if not cur.fetchone():
                    return None

            if guests_replace:
                cur.execute(
                    "DELETE FROM calendar_event_guests WHERE event_id = %s::uuid",
                    (event_id,),
                )
                for name, email in guests:
                    cur.execute(
                        """
                        INSERT INTO calendar_event_guests (event_id, name, email)
                        VALUES (%s::uuid, %s, %s)
                        """,
                        (event_id, name, email),
                    )

        return self.get_event(user_id, event_id)

    def delete_event(self, user_id: str, event_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM calendar_events
                WHERE user_id = %s AND id = %s::uuid
                RETURNING id
                """,
                (user_id, event_id),
            )
            deleted = cur.fetchone()
        return deleted is not None
