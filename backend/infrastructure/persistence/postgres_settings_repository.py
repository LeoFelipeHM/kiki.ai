from datetime import datetime
from typing import Any

import psycopg

_NOTIFICATION_COLUMNS = (
    "push_enabled",
    "email_enabled",
    "sms_enabled",
    "sound_enabled",
    "vibration_enabled",
    "reminders_enabled",
    "meetings_enabled",
    "tasks_enabled",
    "kiki_suggestions_enabled",
    "daily_summary_enabled",
    "weekly_report_enabled",
    "reminder_style",
)


class PostgresSettingsRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def get_ui_prefs(self, user_id: str) -> dict[str, Any]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT theme_mode, assistant_voice
                FROM users
                WHERE id = %s::uuid
                """,
                (user_id,),
            )
            row = cur.fetchone()
        assert row is not None
        return dict(row)

    def patch_ui_prefs(self, user_id: str, theme_mode: str | None, assistant_voice: str | None) -> dict[str, Any]:
        fragments: list[str] = []
        values: list[Any] = []
        if theme_mode is not None:
            fragments.append("theme_mode = %s")
            values.append(theme_mode)
        if assistant_voice is not None:
            fragments.append("assistant_voice = %s")
            values.append(assistant_voice)
        if not fragments:
            return self.get_ui_prefs(user_id)
        values.append(user_id)
        set_clause = ", ".join(fragments + ["updated_at = NOW()"])
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE users
                SET {set_clause}
                WHERE id = %s::uuid
                RETURNING theme_mode, assistant_voice
                """,
                tuple(values),
            )
            row = cur.fetchone()
        assert row is not None
        return dict(row)

    def get_notification_prefs(self, user_id: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {", ".join(_NOTIFICATION_COLUMNS)}
                FROM notification_preferences
                WHERE user_id = %s::uuid
                """,
                (user_id,),
            )
            row = cur.fetchone()
        return dict(row) if row else None

    def patch_notification_prefs(self, user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        invalid = set(updates) - set(_NOTIFICATION_COLUMNS)
        if invalid:
            raise ValueError(f"Campos inválidos: {invalid}")
        fragments: list[str] = []
        values: list[Any] = []
        for k, v in updates.items():
            if k == "reminder_style":
                fragments.append("reminder_style = %s::reminder_style")
            else:
                fragments.append(f"{k} = %s")
            values.append(v)
        values.append(user_id)
        set_clause = ", ".join(fragments + ["updated_at = NOW()"])
        with self._conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE notification_preferences
                SET {set_clause}
                WHERE user_id = %s::uuid
                RETURNING {", ".join(_NOTIFICATION_COLUMNS)}
                """,
                tuple(values),
            )
            row = cur.fetchone()
        assert row is not None
        out = dict(row)
        if out.get("reminder_style") is not None:
            out["reminder_style"] = str(out["reminder_style"])
        return out

    def list_integrations(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT provider::text AS provider, status::text AS status, last_sync_at
                FROM integration_connections
                WHERE user_id = %s::uuid
                ORDER BY provider
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        result = []
        for row in rows:
            r = dict(row)
            if isinstance(r.get("last_sync_at"), datetime):
                pass  # pydantic serializes
            result.append(r)
        return result

    def patch_integration_status(self, user_id: str, provider: str, status: str) -> dict[str, Any] | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE integration_connections
                SET status = %s::integration_status,
                    updated_at = NOW()
                WHERE user_id = %s::uuid AND provider = %s::integration_provider
                RETURNING provider::text AS provider, status::text AS status, last_sync_at
                """,
                (status, user_id, provider),
            )
            row = cur.fetchone()
        return dict(row) if row else None
