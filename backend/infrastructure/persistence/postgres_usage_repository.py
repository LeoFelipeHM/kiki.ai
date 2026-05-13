from datetime import date, datetime
from typing import Any, Literal

import psycopg
from psycopg.types.json import Jsonb

UsageKind = Literal["login", "chat_completion", "voice_session", "token_refresh"]


class PostgresUsageRepository:
    def __init__(self, conn: psycopg.Connection[Any]) -> None:
        self._conn = conn

    def insert_event(self, user_id: str, usage_kind: UsageKind, metadata: dict[str, Any] | None = None) -> None:
        meta_json = Jsonb(metadata) if metadata else None
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO usage_events (user_id, usage_kind, metadata)
                VALUES (%s, %s, %s)
                """,
                (user_id, usage_kind, meta_json),
            )

    def fetch_totals(self, start: datetime, end: datetime) -> dict[str, int]:
        """Contagens globais no intervalo [start, end]. Login + token_refresh = acessos."""
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT usage_kind, COUNT(*)::bigint AS c
                FROM usage_events
                WHERE created_at >= %s AND created_at <= %s
                GROUP BY usage_kind
                """,
                (start, end),
            )
            rows = cur.fetchall()
        by_kind = {"login": 0, "chat_completion": 0, "voice_session": 0, "token_refresh": 0}
        for row in rows:
            kind = str(row["usage_kind"])
            if kind in by_kind:
                by_kind[kind] = int(row["c"])
        events_created = self._count_calendar_events_created(start, end)
        return {
            "accesses": by_kind["login"] + by_kind["token_refresh"],
            "chat_completion": by_kind["chat_completion"],
            "voice_session": by_kind["voice_session"],
            "events_created": events_created,
        }

    def _count_calendar_events_created(self, start: datetime, end: datetime) -> int:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)::bigint AS c
                FROM calendar_events
                WHERE created_at >= %s AND created_at <= %s
                """,
                (start, end),
            )
            row = cur.fetchone()
        return int(row["c"]) if row else 0

    def fetch_per_user(self, start: datetime, end: datetime) -> list[dict[str, Any]]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  u.id AS user_id,
                  u.name,
                  u.email,
                  COALESCE(
                    SUM(
                      CASE WHEN e.usage_kind IN ('login', 'token_refresh') THEN 1 ELSE 0 END
                    ),
                    0
                  )::bigint AS accesses_count,
                  COALESCE(SUM(CASE WHEN e.usage_kind = 'chat_completion' THEN 1 ELSE 0 END), 0)::bigint
                    AS chat_completion_count,
                  COALESCE(SUM(CASE WHEN e.usage_kind = 'voice_session' THEN 1 ELSE 0 END), 0)::bigint
                    AS voice_session_count,
                  COALESCE((
                    SELECT COUNT(*)::bigint
                    FROM calendar_events ce
                    WHERE ce.user_id = u.id
                      AND ce.created_at >= %s
                      AND ce.created_at <= %s
                  ), 0)::bigint AS events_created_count
                FROM users u
                LEFT JOIN usage_events e
                  ON e.user_id = u.id
                  AND e.created_at >= %s
                  AND e.created_at <= %s
                GROUP BY u.id, u.name, u.email
                ORDER BY u.name ASC NULLS LAST, u.email ASC
                """,
                (start, end, start, end),
            )
            rows = cur.fetchall()
        out: list[dict[str, Any]] = []
        for row in rows:
            out.append(
                {
                    "user_id": str(row["user_id"]),
                    "name": row["name"],
                    "email": row["email"],
                    "accesses": int(row["accesses_count"]),
                    "chat_completion": int(row["chat_completion_count"]),
                    "voice_session": int(row["voice_session_count"]),
                    "events_created": int(row["events_created_count"]),
                }
            )
        return out

    def fetch_timeseries(self, start: datetime, end: datetime) -> list[dict[str, Any]]:
        """Um registro por dia no calendário de Brasília: uso agregado + eventos de calendário criados."""
        usage_by_day: dict[str, dict[str, int]] = {}
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  (DATE(created_at AT TIME ZONE 'America/Sao_Paulo')) AS day,
                  COUNT(*) FILTER (WHERE usage_kind IN ('login', 'token_refresh'))::bigint AS accesses,
                  COUNT(*) FILTER (WHERE usage_kind = 'chat_completion')::bigint AS chat_completion,
                  COUNT(*) FILTER (WHERE usage_kind = 'voice_session')::bigint AS voice_session
                FROM usage_events
                WHERE created_at >= %s AND created_at <= %s
                GROUP BY 1
                """,
                (start, end),
            )
            for row in cur.fetchall():
                d = row["day"]
                day_val: date | str = d if isinstance(d, date) else d
                day_key = day_val.isoformat() if hasattr(day_val, "isoformat") else str(day_val)
                usage_by_day[day_key] = {
                    "accesses": int(row["accesses"]),
                    "chat_completion": int(row["chat_completion"]),
                    "voice_session": int(row["voice_session"]),
                }

        cal_by_day: dict[str, int] = {}
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  (DATE(created_at AT TIME ZONE 'America/Sao_Paulo')) AS day,
                  COUNT(*)::bigint AS c
                FROM calendar_events
                WHERE created_at >= %s AND created_at <= %s
                GROUP BY 1
                """,
                (start, end),
            )
            for row in cur.fetchall():
                d = row["day"]
                day_val = d if isinstance(d, date) else d
                day_key = day_val.isoformat() if hasattr(day_val, "isoformat") else str(day_val)
                cal_by_day[day_key] = int(row["c"])

        all_days = sorted(set(usage_by_day.keys()) | set(cal_by_day.keys()))
        result: list[dict[str, Any]] = []
        for day_key in all_days:
            u = usage_by_day.get(day_key, {"accesses": 0, "chat_completion": 0, "voice_session": 0})
            result.append(
                {
                    "day": day_key,
                    "accesses": u["accesses"],
                    "chat_completion": u["chat_completion"],
                    "voice_session": u["voice_session"],
                    "events_created": cal_by_day.get(day_key, 0),
                }
            )
        return result
