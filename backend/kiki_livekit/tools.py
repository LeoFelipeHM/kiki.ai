from __future__ import annotations

import json
from typing import Any, cast

import psycopg
from livekit.agents import function_tool
from livekit.agents.llm import RawFunctionTool
from psycopg.rows import dict_row

from application.calendar_service import CalendarService
from application.contacts_service import ContactsService
from application.notes_service import NotesService
from infrastructure.persistence.postgres_calendar_repository import PostgresCalendarRepository
from infrastructure.persistence.postgres_contacts_repository import PostgresContactsRepository
from infrastructure.persistence.postgres_notes_repository import PostgresNotesRepository
from llm.tools.dispatcher import execute_tool_call
from llm.tools.schemas import ToolName, tools_schema


def _raw_schema_from_openai_tool(tool: dict[str, Any]) -> dict[str, Any]:
    fn = cast(dict[str, Any], tool.get("function") or {})
    return {
        "name": str(fn.get("name") or ""),
        "description": str(fn.get("description") or ""),
        "parameters": cast(dict[str, Any], fn.get("parameters") or {"type": "object"}),
    }


def build_livekit_tools(
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    database_url: str,
    on_note_changed: Any | None = None,
    on_note_deleted: Any | None = None,
) -> list[RawFunctionTool]:
    tools: list[RawFunctionTool] = []

    for schema in tools_schema():
        raw_schema = _raw_schema_from_openai_tool(schema)
        tool_name = cast(ToolName, raw_schema["name"])

        def _call_tool(raw_arguments: dict[str, Any], *, _tool_name: ToolName = tool_name) -> dict[str, Any]:
            with psycopg.connect(database_url, row_factory=dict_row) as conn:
                notes_service = NotesService(conn, PostgresNotesRepository(conn))
                if on_note_changed is not None:
                    notes_service = _RealtimeNotesService(notes_service, on_note_changed, on_note_deleted)
                result = execute_tool_call(
                    _tool_name,
                    raw_arguments,
                    current_user_id=current_user_id,
                    current_user_timezone=current_user_timezone,
                    calendar_service=CalendarService(conn, PostgresCalendarRepository(conn)),
                    notes_service=notes_service,
                    contacts_service=ContactsService(conn, PostgresContactsRepository(conn)),
                )
            return json.loads(json.dumps(result, ensure_ascii=False, default=str))

        tools.append(function_tool(_call_tool, raw_schema=raw_schema))

    return tools


class _RealtimeNotesService:
    def __init__(self, inner: NotesService, on_note_changed: Any, on_note_deleted: Any | None) -> None:
        self._inner = inner
        self._on_note_changed = on_note_changed
        self._on_note_deleted = on_note_deleted

    def list_notes(self, *args: Any, **kwargs: Any) -> Any:
        return self._inner.list_notes(*args, **kwargs)

    def create_note(self, *args: Any, **kwargs: Any) -> Any:
        row = self._inner.create_note(*args, **kwargs)
        self._on_note_changed(row)
        return row

    def get_note(self, *args: Any, **kwargs: Any) -> Any:
        return self._inner.get_note(*args, **kwargs)

    def update_note(self, *args: Any, **kwargs: Any) -> Any:
        row = self._inner.update_note(*args, **kwargs)
        if row:
            self._on_note_changed(row)
        return row

    def delete_note(self, user_id: str, note_id: str) -> bool:
        ok = self._inner.delete_note(user_id, note_id)
        if ok and self._on_note_deleted is not None:
            self._on_note_deleted(note_id)
        return ok
