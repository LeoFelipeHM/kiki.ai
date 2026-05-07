from datetime import datetime
from typing import Any

import psycopg

from application.ports import CalendarRepository
from domain.calendar import InvalidEventIntervalError


class CalendarService:
    def __init__(self, conn: psycopg.Connection[Any], calendar_repo: CalendarRepository) -> None:
        self._conn = conn
        self._repo = calendar_repo

    @staticmethod
    def _ensure_interval(starts_at: datetime, ends_at: datetime) -> None:
        if ends_at <= starts_at:
            raise InvalidEventIntervalError("ends_at deve ser maior que starts_at.")

    def list_events(
        self,
        user_id: str,
        range_from: datetime | None,
        range_to: datetime | None,
    ) -> list[dict[str, Any]]:
        return self._repo.list_events(user_id, range_from, range_to)

    def create_event(
        self,
        user_id: str,
        *,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        event_type: str,
        color: str | None,
        description: str | None,
        status: str,
        guests: list[tuple[str, str | None]],
    ) -> dict[str, Any]:
        self._ensure_interval(starts_at, ends_at)
        row = self._repo.create_event(
            user_id,
            title,
            starts_at,
            ends_at,
            event_type,
            color,
            description,
            status,
            guests,
        )
        self._conn.commit()
        return row

    def get_event(self, user_id: str, event_id: str) -> dict[str, Any] | None:
        return self._repo.get_event(user_id, event_id)

    def update_event(
        self,
        user_id: str,
        event_id: str,
        *,
        title: str | None = None,
        starts_at: datetime | None = None,
        ends_at: datetime | None = None,
        event_type: str | None = None,
        color: str | None = None,
        description: str | None = None,
        status: str | None = None,
        guests_replace: bool = False,
        guests: list[tuple[str, str | None]] | None = None,
    ) -> dict[str, Any] | None:
        current = self._repo.get_event(user_id, event_id)
        if not current:
            return None

        effective_start = starts_at if starts_at is not None else current["starts_at"]
        effective_end = ends_at if ends_at is not None else current["ends_at"]
        self._ensure_interval(effective_start, effective_end)

        guest_rows: list[tuple[str, str | None]] = (
            (guests if guests is not None else []) if guests_replace else []
        )
        row = self._repo.update_event(
            user_id,
            event_id,
            title,
            starts_at,
            ends_at,
            event_type,
            color,
            description,
            status,
            guests_replace,
            guest_rows,
        )
        self._conn.commit()
        return row

    def delete_event(self, user_id: str, event_id: str) -> bool:
        ok = self._repo.delete_event(user_id, event_id)
        self._conn.commit()
        return ok
