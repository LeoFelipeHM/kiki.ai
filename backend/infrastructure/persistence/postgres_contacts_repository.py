from typing import Any

import psycopg


def _normalize(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["id"] = str(out["id"])
    out["user_id"] = str(out["user_id"])
    return out


class PostgresContactsRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def list_contacts(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, name, email, created_at, updated_at
                FROM contacts
                WHERE user_id = %s
                ORDER BY lower(name), lower(email)
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        return [_normalize(dict(r)) for r in rows]

    def create_contact(self, user_id: str, name: str, email: str) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO contacts (user_id, name, email)
                VALUES (%s, %s, %s)
                RETURNING id, user_id, name, email, created_at, updated_at
                """,
                (user_id, name, email),
            )
            row = cur.fetchone()
        assert row is not None
        return _normalize(dict(row))

    def get_contact(self, user_id: str, contact_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, name, email, created_at, updated_at
                FROM contacts
                WHERE user_id = %s AND id = %s::uuid
                """,
                (user_id, contact_id),
            )
            row = cur.fetchone()
        return _normalize(dict(row)) if row else None

    def update_contact(
        self,
        user_id: str,
        contact_id: str,
        *,
        name: str | None = None,
        email: str | None = None,
    ) -> dict[str, Any] | None:
        fields: list[str] = []
        params: list[Any] = []
        if name is not None:
            fields.append("name = %s")
            params.append(name)
        if email is not None:
            fields.append("email = %s")
            params.append(email)
        if not fields:
            return self.get_contact(user_id, contact_id)

        params.extend([user_id, contact_id])
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE contacts
                SET {", ".join(fields)}
                WHERE user_id = %s AND id = %s::uuid
                RETURNING id, user_id, name, email, created_at, updated_at
                """,
                tuple(params),
            )
            row = cur.fetchone()
        return _normalize(dict(row)) if row else None

    def delete_contact(self, user_id: str, contact_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                "DELETE FROM contacts WHERE user_id = %s AND id = %s::uuid",
                (user_id, contact_id),
            )
            return cur.rowcount > 0
