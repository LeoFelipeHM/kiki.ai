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


class ContactsRepository(Protocol):
    def list_contacts(self, user_id: str) -> list[dict[str, Any]]: ...

    def create_contact(self, user_id: str, name: str, email: str) -> dict[str, Any]: ...

    def get_contact(self, user_id: str, contact_id: str) -> dict[str, Any] | None: ...

    def update_contact(
        self,
        user_id: str,
        contact_id: str,
        *,
        name: str | None = None,
        email: str | None = None,
    ) -> dict[str, Any] | None: ...

    def delete_contact(self, user_id: str, contact_id: str) -> bool: ...


class AgentsRepository(Protocol):
    def list_agents(self, user_id: str) -> list[dict[str, Any]]: ...

    def create_agent(
        self,
        user_id: str,
        *,
        name: str,
        agent_type: str,
        task: str,
        effort: str,
        color: str,
        sort_order: int,
        steps: list[str],
    ) -> dict[str, Any]: ...

    def get_agent(self, user_id: str, agent_id: str) -> dict[str, Any] | None: ...

    def update_agent_effort(
        self,
        user_id: str,
        agent_id: str,
        effort: str,
        steps: list[str] | None,
    ) -> dict[str, Any] | None: ...

    def set_agent_status(
        self,
        user_id: str,
        agent_id: str,
        status: str,
        *,
        current_action: str | None = None,
    ) -> dict[str, Any] | None: ...

    def delete_agent(self, user_id: str, agent_id: str) -> bool: ...

    def reorder_agents(self, user_id: str, agent_ids: list[str]) -> list[dict[str, Any]]: ...

    def list_messages(self, user_id: str, agent_id: str) -> list[dict[str, Any]] | None: ...

    def create_message(self, user_id: str, agent_id: str, role: str, content: str) -> dict[str, Any] | None: ...
