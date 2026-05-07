from datetime import datetime
from typing import Any, Protocol


class CalendarRepository(Protocol):
    def list_events(
        self,
        user_id: str,
        range_from: datetime | None,
        range_to: datetime | None,
    ) -> list[dict[str, Any]]: ...

    def create_event(
        self,
        user_id: str,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        event_type: str,
        color: str | None,
        description: str | None,
        status: str,
        guests: list[tuple[str, str | None]],
    ) -> dict[str, Any]: ...

    def get_event(self, user_id: str, event_id: str) -> dict[str, Any] | None: ...

    def update_event(
        self,
        user_id: str,
        event_id: str,
        title: str | None,
        starts_at: datetime | None,
        ends_at: datetime | None,
        event_type: str | None,
        color: str | None,
        description: str | None,
        status: str | None,
        guests_replace: bool,
        guests: list[tuple[str, str | None]],
    ) -> dict[str, Any] | None: ...

    def delete_event(self, user_id: str, event_id: str) -> bool: ...


class NotesRepository(Protocol):
    def list_notes(self, user_id: str, search: str | None) -> list[dict[str, Any]]: ...

    def create_note(
        self,
        user_id: str,
        title: str,
        content: str,
        is_pinned: bool,
        is_locked: bool,
        tags: list[str],
    ) -> dict[str, Any]: ...

    def get_note(self, user_id: str, note_id: str) -> dict[str, Any] | None: ...

    def update_note(
        self,
        user_id: str,
        note_id: str,
        *,
        title: str | None = None,
        content: str | None = None,
        is_pinned: bool | None = None,
        is_locked: bool | None = None,
        tags_replace: bool = False,
        tags: list[str] | None = None,
    ) -> dict[str, Any] | None: ...

    def delete_note(self, user_id: str, note_id: str) -> bool: ...
