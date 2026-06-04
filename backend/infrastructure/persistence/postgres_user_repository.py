from datetime import datetime
from typing import Any, Literal

import psycopg


def user_row_for_response(row: dict[str, Any]) -> dict[str, Any]:
    out = dict(row)
    out["id"] = str(out["id"])
    if out.get("role") is not None:
        out["role"] = str(out["role"])
    return out


class PostgresUserRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def insert_registered_user(self, name: str, email: str, nickname: str, password_hash: str) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, nickname, role, password_hash, password_updated_at)
                VALUES (%s, %s, %s, 'user', %s, NOW())
                RETURNING id, name, email, nickname, role, is_active
                """,
                (name, email.lower(), nickname, password_hash),
            )
            row = cur.fetchone()
        assert row is not None
        return user_row_for_response(row)

    def email_exists(self, email: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email.lower(),))
            return cur.fetchone() is not None

    def nickname_exists(self, nickname: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE lower(nickname) = lower(%s)", (nickname,))
            return cur.fetchone() is not None

    def nickname_taken_by_other(self, nickname: str, exclude_user_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM users WHERE lower(nickname) = lower(%s) AND id <> %s::uuid",
                (nickname, exclude_user_id),
            )
            return cur.fetchone() is not None

    def update_profile(
        self,
        user_id: str,
        *,
        name: str | None = None,
        nickname: str | None = None,
    ) -> dict[str, Any] | None:
        updates: list[str] = []
        values: list[Any] = []
        if name is not None:
            updates.append("name = %s")
            values.append(name)
        if nickname is not None:
            updates.append("nickname = %s")
            values.append(nickname)
        if not updates:
            return self.get_public_profile(user_id)
        set_clause = ", ".join(updates + ["updated_at = NOW()"])
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE users
                SET {set_clause}
                WHERE id = %s::uuid
                RETURNING id, name, email, nickname, role, is_active
                """,
                (*values, user_id),
            )
            row = cur.fetchone()
        return user_row_for_response(row) if row else None

    def find_for_login(self, email: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, nickname, role, is_active, password_hash, failed_login_attempts, locked_until
                FROM users
                WHERE email = %s
                """,
                (email.lower(),),
            )
            return cur.fetchone()

    def update_failed_login(self, user_id: Any, failed_attempts: int, locked_until: datetime | None) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET failed_login_attempts = %s,
                    locked_until = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (failed_attempts, locked_until, user_id),
            )

    def clear_lockout_and_mark_login(self, user_id: Any) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET failed_login_attempts = 0,
                    locked_until = NULL,
                    last_login_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, name, email, nickname, role, is_active
                """,
                (user_id,),
            )
            row = cur.fetchone()
        assert row is not None
        return user_row_for_response(row)

    def find_credentials_by_id(self, user_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, role, is_active, password_hash, failed_login_attempts, locked_until
                FROM users
                WHERE id = %s::uuid
                """,
                (user_id,),
            )
            row = cur.fetchone()
        if not row:
            return None
        out = dict(row)
        out["id"] = str(out["id"])
        if out.get("role") is not None:
            out["role"] = str(out["role"])
        return out

    def update_password_hash(self, user_id: str, password_hash: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET password_hash = %s,
                    password_updated_at = NOW(),
                    failed_login_attempts = 0,
                    locked_until = NULL,
                    updated_at = NOW()
                WHERE id = %s::uuid
                """,
                (password_hash, user_id),
            )

    def get_public_profile(self, user_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, nickname, role, is_active, timezone, assistant_voice
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
        return user_row_for_response(row) if row else None

    def admin_list(self) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, nickname, role::text AS role, is_active, created_at
                FROM users
                ORDER BY created_at DESC
                """
            )
            return list(cur.fetchall())

    def admin_email_taken(self, email: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE lower(email) = lower(%s)", (email,))
            return cur.fetchone() is not None

    def admin_insert(
        self,
        name: str,
        email: str,
        nickname: str,
        role: Literal["admin", "user"],
        password_hash: str,
    ) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, nickname, role, password_hash, password_updated_at, is_active)
                VALUES (%s, lower(%s), %s, %s::user_role, %s, NOW(), TRUE)
                RETURNING id, name, email, nickname, role::text AS role, is_active, created_at
                """,
                (name, email, nickname, role, password_hash),
            )
            row = cur.fetchone()
        assert row is not None
        return {**row, "id": str(row["id"])}

    def admin_email_taken_by_other(self, email: str, exclude_user_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM users WHERE lower(email) = lower(%s) AND id <> %s::uuid",
                (email, exclude_user_id),
            )
            return cur.fetchone() is not None

    def admin_apply_update(self, user_id: str, set_fragments: list[str], values: tuple[Any, ...]) -> dict[str, Any] | None:
        set_clause = ", ".join(set_fragments + ["updated_at = NOW()"])
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE users
                SET {set_clause}
                WHERE id = %s::uuid
                RETURNING id, name, email, nickname, role::text AS role, is_active, created_at
                """,
                (*values, user_id),
            )
            row = cur.fetchone()
        if not row:
            return None
        return {**row, "id": str(row["id"])}

    def admin_delete(self, user_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s::uuid RETURNING id", (user_id,))
            return cur.fetchone() is not None
