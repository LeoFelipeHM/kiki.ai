from typing import Any

import psycopg


def bootstrap_user_defaults(conn: psycopg.Connection[Any], user_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notification_preferences (user_id)
            VALUES (%s)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id,),
        )
        cur.execute(
            """
            INSERT INTO privacy_preferences (user_id)
            VALUES (%s)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id,),
        )
        cur.execute(
            """
            INSERT INTO subscriptions (user_id, plan_code, status, amount, billing_cycle)
            VALUES (%s, 'free', 'active', 0.00, 'monthly')
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id,),
        )
        for provider in ("google_calendar", "gmail", "outlook", "apple_watch"):
            cur.execute(
                """
                INSERT INTO integration_connections (user_id, provider, status)
                VALUES (%s, %s::integration_provider, 'disconnected'::integration_status)
                ON CONFLICT (user_id, provider) DO NOTHING
                """,
                (user_id, provider),
            )
