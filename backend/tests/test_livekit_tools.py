from __future__ import annotations

from kiki_livekit import tools as voice_tools


class _FakeConnection:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeService:
    def __init__(self, *args, **kwargs):
        pass


class _FakeDate:
    def __str__(self):
        return "2026-05-22T10:00:00-03:00"


def test_livekit_tool_adapter_reuses_dispatcher(monkeypatch):
    captured = {}

    def fake_execute_tool_call(name, arguments, **kwargs):
        captured["name"] = name
        captured["arguments"] = arguments
        captured["kwargs"] = kwargs
        return {"ok": True, "data": {"starts_at": _FakeDate()}}

    monkeypatch.setattr(voice_tools.psycopg, "connect", lambda *args, **kwargs: _FakeConnection())
    monkeypatch.setattr(voice_tools, "CalendarService", _FakeService)
    monkeypatch.setattr(voice_tools, "PostgresCalendarRepository", _FakeService)
    monkeypatch.setattr(voice_tools, "NotesService", _FakeService)
    monkeypatch.setattr(voice_tools, "PostgresNotesRepository", _FakeService)
    monkeypatch.setattr(voice_tools, "ContactsService", _FakeService)
    monkeypatch.setattr(voice_tools, "PostgresContactsRepository", _FakeService)
    monkeypatch.setattr(voice_tools, "execute_tool_call", fake_execute_tool_call)

    tool = next(
        t
        for t in voice_tools.build_livekit_tools(
            current_user_id="user-1",
            current_user_timezone="America/Sao_Paulo",
            database_url="postgresql://example",
        )
        if t.info.name == "calendar_list_events"
    )

    result = tool(raw_arguments={"from_iso": None, "to_iso": None})

    assert captured["name"] == "calendar_list_events"
    assert captured["arguments"] == {"from_iso": None, "to_iso": None}
    assert captured["kwargs"]["current_user_id"] == "user-1"
    assert captured["kwargs"]["current_user_timezone"] == "America/Sao_Paulo"
    assert result == {"ok": True, "data": {"starts_at": "2026-05-22T10:00:00-03:00"}}


def test_livekit_tool_adapter_exposes_calendar_create(monkeypatch):
    captured = {}

    def fake_execute_tool_call(name, arguments, **kwargs):
        captured["name"] = name
        captured["arguments"] = arguments
        captured["kwargs"] = kwargs
        return {"ok": True, "data": {"id": "event-1", "title": arguments["title"]}}

    monkeypatch.setattr(voice_tools.psycopg, "connect", lambda *args, **kwargs: _FakeConnection())
    monkeypatch.setattr(voice_tools, "CalendarService", _FakeService)
    monkeypatch.setattr(voice_tools, "PostgresCalendarRepository", _FakeService)
    monkeypatch.setattr(voice_tools, "NotesService", _FakeService)
    monkeypatch.setattr(voice_tools, "PostgresNotesRepository", _FakeService)
    monkeypatch.setattr(voice_tools, "ContactsService", _FakeService)
    monkeypatch.setattr(voice_tools, "PostgresContactsRepository", _FakeService)
    monkeypatch.setattr(voice_tools, "execute_tool_call", fake_execute_tool_call)

    tool = next(
        t
        for t in voice_tools.build_livekit_tools(
            current_user_id="user-1",
            current_user_timezone="America/Sao_Paulo",
            database_url="postgresql://example",
        )
        if t.info.name == "calendar_create_event"
    )

    result = tool(
        raw_arguments={
            "title": "Consulta",
            "starts_at": "2026-05-22T10:00:00-03:00",
            "ends_at": "2026-05-22T11:00:00-03:00",
            "event_type": "personal",
        }
    )

    assert captured["name"] == "calendar_create_event"
    assert captured["arguments"]["title"] == "Consulta"
    assert captured["kwargs"]["current_user_id"] == "user-1"
    assert result == {"ok": True, "data": {"id": "event-1", "title": "Consulta"}}
