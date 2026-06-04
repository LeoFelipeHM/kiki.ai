from datetime import datetime
from typing import Any

import psycopg

from application.notifications_service import NotificationsService
from application.ports import CalendarRepository
from domain.calendar import InvalidEventIntervalError, ScheduleConflictError
from domain.recurrence import RecurrenceFrequency, expand_recurrence
from infrastructure.persistence.postgres_friends_repository import PostgresFriendsRepository


class CalendarService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        calendar_repo: CalendarRepository,
        friends_repo: PostgresFriendsRepository | None = None,
        notifications: NotificationsService | None = None,
    ) -> None:
        self._conn = conn
        self._repo = calendar_repo
        self._friends_repo = friends_repo
        self._notifications = notifications

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
        created_by_user_id: str | None = None,
        source_request_id: str | None = None,
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
            created_by_user_id=created_by_user_id,
            source_request_id=source_request_id,
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

    def list_friend_events(
        self,
        current_user_id: str,
        friend_user_id: str,
        range_from: datetime | None,
        range_to: datetime | None,
    ) -> list[dict[str, Any]]:
        if self._friends_repo is None:
            raise PermissionError("Permissões de amizade indisponíveis.")
        permissions = self._friends_repo.get_permissions_between(friend_user_id, current_user_id)
        if not permissions or not permissions.get("can_view_calendar"):
            raise PermissionError("Você não tem permissão para consultar esta agenda.")
        return self._repo.list_events(friend_user_id, range_from, range_to)

    def create_friend_event_or_request(
        self,
        current_user_id: str,
        friend_user_id: str,
        actor_name: str,
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
        if self._friends_repo is None:
            raise PermissionError("Permissões de amizade indisponíveis.")
        permissions = self._friends_repo.get_permissions_between(friend_user_id, current_user_id)
        if not permissions:
            raise PermissionError("Vocês precisam ser amigos para usar esta agenda.")
        if permissions.get("can_create_calendar_events_direct"):
            row = self.create_event(
                friend_user_id,
                title=title,
                starts_at=starts_at,
                ends_at=ends_at,
                event_type=event_type,
                color=color,
                description=description,
                status=status,
                guests=guests,
                created_by_user_id=current_user_id,
            )
            if self._notifications is not None:
                self._notifications.notify(
                    user_id=friend_user_id,
                    actor_user_id=current_user_id,
                    kind="calendar_event_created",
                    title="Evento criado na sua agenda",
                    body=f"{actor_name} criou um evento na sua agenda.",
                    payload={"event_id": row["id"], "title": row["title"]},
                    related_entity_type="calendar_event",
                    related_entity_id=row["id"],
                    status="read",
                )
            self._conn.commit()
            return {"mode": "created", "event": row}
        if not permissions.get("can_request_calendar_events"):
            raise PermissionError("Este amigo não permite solicitações de eventos.")
        if self._notifications is None:
            raise PermissionError("Notificações indisponíveis para solicitar evento.")
        payload = {
            "title": title,
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "event_type": event_type,
            "color": color,
            "description": description,
            "status": status,
            "guests": [{"name": name, "email": email} for name, email in guests],
        }
        notification = self._notifications.notify(
            user_id=friend_user_id,
            actor_user_id=current_user_id,
            kind="calendar_event_request",
            title="Pedido de evento na sua agenda",
            body=f"{actor_name} quer adicionar um evento na sua agenda.",
            payload=payload,
            related_entity_type="calendar_event_request",
        )
        self._conn.commit()
        return {"mode": "requested", "notification": notification}

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
