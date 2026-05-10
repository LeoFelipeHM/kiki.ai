from datetime import datetime
from typing import Any

import psycopg

from application.ports import CalendarRepository
from domain.calendar import InvalidEventIntervalError, ScheduleConflictError
from domain.recurrence import RecurrenceFrequency, expand_recurrence


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

    def find_conflicts(
        self,
        user_id: str,
        starts_at: datetime,
        ends_at: datetime,
        *,
        exclude_event_id: str | None = None,
    ) -> list[dict[str, Any]]:
        rows = self.list_events(user_id, starts_at, ends_at)
        if exclude_event_id:
            rows = [r for r in rows if str(r.get("id")) != str(exclude_event_id)]
        return rows

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

    def create_recurring_series(
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
        frequency: RecurrenceFrequency,
        interval: int,
        count: int | None,
        until: datetime | None,
    ) -> dict[str, Any]:
        """Cria várias linhas em `calendar_events` (uma por ocorrência), uma única transação."""
        slots = expand_recurrence(
            starts_at,
            ends_at,
            frequency=frequency,
            interval=interval,
            count=count,
            until=until,
        )
        for slot_start, slot_end in slots:
            self._ensure_interval(slot_start, slot_end)
            conflicts = self.find_conflicts(user_id, slot_start, slot_end)
            if conflicts:
                raise ScheduleConflictError(slot_start, conflicts)

        created: list[dict[str, Any]] = []
        try:
            for slot_start, slot_end in slots:
                row = self._repo.create_event(
                    user_id,
                    title,
                    slot_start,
                    slot_end,
                    event_type,
                    color,
                    description,
                    status,
                    guests,
                )
                created.append(row)
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise

        return {
            "events": created,
            "occurrences": len(created),
            "recurrence": {"frequency": frequency, "interval": interval, "count": count, "until": until},
        }

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
