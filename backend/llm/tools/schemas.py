from __future__ import annotations

from typing import Any, Literal

ToolName = Literal[
    "calendar_list_events",
    "calendar_create_event",
    "calendar_update_event",
    "calendar_delete_event",
    "notes_list_notes",
    "notes_create_note",
    "notes_update_note",
    "notes_delete_note",
]


def tools_schema() -> list[dict[str, Any]]:
    """JSON Schema para OpenAI Chat Completions tool-calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": "calendar_list_events",
                "description": "Lista eventos do calendário do usuário em um intervalo. Prefira ISO 8601 com timezone (ex.: 2026-05-09T09:00:00-03:00). Se from/to não forem informados, usa a semana atual (seg-dom).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "from_iso": {"type": ["string", "null"], "description": "Início do intervalo em ISO 8601 (inclua timezone/offset quando possível)."},
                        "to_iso": {"type": ["string", "null"], "description": "Fim do intervalo em ISO 8601 (inclua timezone/offset quando possível)."},
                    },
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_create_event",
                "description": "Cria um evento no calendário do usuário. Use ISO 8601 com timezone/offset (ex.: 2026-05-09T09:00:00-03:00) para evitar erro de fuso.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "starts_at": {"type": "string", "description": "ISO 8601 com timezone/offset quando possível."},
                        "ends_at": {"type": "string", "description": "ISO 8601 com timezone/offset quando possível."},
                        "event_type": {"type": "string", "enum": ["meeting", "task", "personal"]},
                        "color": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                        "status": {"type": "string"},
                        "guests": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "email": {"type": ["string", "null"]},
                                },
                                "required": ["name"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "required": ["title", "starts_at", "ends_at", "event_type"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_update_event",
                "description": "Atualiza campos de um evento existente.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {"type": "string"},
                        "title": {"type": ["string", "null"]},
                        "starts_at": {"type": ["string", "null"], "description": "ISO 8601 (inclua timezone/offset quando possível)."},
                        "ends_at": {"type": ["string", "null"], "description": "ISO 8601 (inclua timezone/offset quando possível)."},
                        "event_type": {
                            "oneOf": [
                                {"type": "string", "enum": ["meeting", "task", "personal"]},
                                {"type": "null"},
                            ]
                        },
                        "color": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                        "status": {"type": ["string", "null"]},
                        "guests": {
                            "type": ["array", "null"],
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "email": {"type": ["string", "null"]},
                                },
                                "required": ["name"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "required": ["event_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calendar_delete_event",
                "description": "Exclui um evento do calendário do usuário.",
                "parameters": {
                    "type": "object",
                    "properties": {"event_id": {"type": "string"}},
                    "required": ["event_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_list_notes",
                "description": "Lista notas do usuário. Se q for informado, busca em título, conteúdo e tags.",
                "parameters": {
                    "type": "object",
                    "properties": {"q": {"type": ["string", "null"]}},
                    "required": [],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_create_note",
                "description": "Cria uma nota.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "content": {"type": "string"},
                        "is_pinned": {"type": "boolean"},
                        "is_locked": {"type": "boolean"},
                        "tags": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["title", "content"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_update_note",
                "description": "Atualiza campos de uma nota existente.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "note_id": {"type": "string"},
                        "title": {"type": ["string", "null"]},
                        "content": {"type": ["string", "null"]},
                        "is_pinned": {"type": ["boolean", "null"]},
                        "is_locked": {"type": ["boolean", "null"]},
                        "tags": {"type": ["array", "null"], "items": {"type": "string"}},
                    },
                    "required": ["note_id"],
                    "additionalProperties": False,
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "notes_delete_note",
                "description": "Exclui uma nota do usuário.",
                "parameters": {
                    "type": "object",
                    "properties": {"note_id": {"type": "string"}},
                    "required": ["note_id"],
                    "additionalProperties": False,
                },
            },
        },
    ]

