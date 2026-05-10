from typing import Any

import psycopg


class PostgresPushRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def upsert_subscription(
        self,
        user_id: str,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: str | None,
    ) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
                VALUES (%s::uuid, %s, %s, %s, %s)
                ON CONFLICT (endpoint) DO UPDATE
                SET user_id = EXCLUDED.user_id,
                    p256dh = EXCLUDED.p256dh,
                    auth = EXCLUDED.auth,
                    user_agent = EXCLUDED.user_agent,
                    last_seen_at = NOW()
                RETURNING id::text, user_id::text, endpoint, p256dh, auth, user_agent,
                          created_at, last_seen_at
                """,
                (user_id, endpoint, p256dh, auth, user_agent),
            )
            row = cur.fetchone()
        assert row is not None
        return dict(row)

    def delete_subscription(self, user_id: str, endpoint: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM push_subscriptions
                WHERE user_id = %s::uuid AND endpoint = %s
                RETURNING id
                """,
                (user_id, endpoint),
            )
            row = cur.fetchone()
        return row is not None

    def delete_subscription_by_endpoint(self, endpoint: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                "DELETE FROM push_subscriptions WHERE endpoint = %s RETURNING id",
                (endpoint,),
            )
            row = cur.fetchone()
        return row is not None

    def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT endpoint, p256dh, auth, user_agent
                FROM push_subscriptions
                WHERE user_id = %s::uuid
                ORDER BY created_at ASC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        return [dict(r) for r in rows]

    def list_user_ids_with_subscriptions(self) -> list[str]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT user_id::text AS user_id
                FROM push_subscriptions
                """,
            )
            rows = cur.fetchall()
        return [r["user_id"] for r in rows]

    def touch_subscription(self, endpoint: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                "UPDATE push_subscriptions SET last_seen_at = NOW() WHERE endpoint = %s",
                (endpoint,),
            )

    def was_delivered(self, user_id: str, dedup_key: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM notification_deliveries
                WHERE user_id = %s::uuid AND dedup_key = %s
                LIMIT 1
                """,
                (user_id, dedup_key),
            )
            row = cur.fetchone()
        return row is not None

    def mark_delivered(self, user_id: str, kind: str, dedup_key: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO notification_deliveries (user_id, kind, dedup_key)
                VALUES (%s::uuid, %s, %s)
                ON CONFLICT (user_id, dedup_key) DO NOTHING
                """,
                (user_id, kind, dedup_key),
            )

    def cleanup_old_deliveries(self, retention_days: int = 14) -> int:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM notification_deliveries
                WHERE sent_at < NOW() - (%s || ' days')::interval
                """,
                (str(retention_days),),
            )
            return cur.rowcount or 0
