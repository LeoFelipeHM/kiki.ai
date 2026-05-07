from datetime import datetime
from typing import Any

import psycopg


class PostgresRefreshTokenRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def insert(
        self,
        user_id: Any,
        jti: str,
        token_hash: str,
        expires_at: datetime,
        user_agent: str | None,
        ip_address: str | None,
    ) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO refresh_tokens (user_id, jti, token_hash, expires_at, user_agent, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s::inet)
                """,
                (user_id, jti, token_hash, expires_at, user_agent, ip_address),
            )

    def find_by_jti_and_hash(self, jti: str, token_hash: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, expires_at, revoked_at
                FROM refresh_tokens
                WHERE jti = %s AND token_hash = %s
                """,
                (jti, token_hash),
            )
            return cur.fetchone()

    def revoke_with_successor(self, row_id: Any, new_jti: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = NOW(),
                    replaced_by_jti = %s
                WHERE id = %s
                """,
                (new_jti, row_id),
            )

    def revoke_by_jti_hash(self, jti: str, token_hash: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE jti = %s AND token_hash = %s AND revoked_at IS NULL
                """,
                (jti, token_hash),
            )

    def revoke_all_for_user(self, user_id: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE user_id = %s::uuid AND revoked_at IS NULL
                """,
                (user_id,),
            )
