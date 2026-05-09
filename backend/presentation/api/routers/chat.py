import json
import os
from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from psycopg.rows import dict_row

from application.calendar_service import CalendarService
from application.notes_service import NotesService
from infrastructure.persistence.postgres_calendar_repository import PostgresCalendarRepository
from infrastructure.persistence.postgres_notes_repository import PostgresNotesRepository
from llm.openai_chat_client import (
    OpenAIChatCompletionError,
    OpenAIChatConfigurationError,
    generate_reply_stream_with_tools,
    generate_reply_with_tools,
)
from presentation.api.dependencies import (
    CurrentUserDep,
    get_calendar_service,
    get_notes_service,
    settings,
)
from presentation.api.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

CalendarServiceDep = Annotated[CalendarService, Depends(get_calendar_service)]
NotesServiceDep = Annotated[NotesService, Depends(get_notes_service)]


@router.post("/stream")
def chat_completion_stream(
    payload: ChatRequest,
    current_user: CurrentUserDep,
):
    """Resposta em SSE (`text/event-stream`): eventos `data: {"delta":"..."}` e final `data: [DONE]`."""
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY não configurada.",
        )
    if not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DATABASE_URL não configurada.",
        )

    pairs = [(m.role, m.content) for m in payload.messages]

    def sse():
        conn: psycopg.Connection | None = None
        try:
            # Importante: em StreamingResponse, dependências com `yield` podem ser finalizadas
            # antes do gerador terminar. Por isso a conexão precisa viver dentro do gerador.
            conn = psycopg.connect(settings.database_url, row_factory=dict_row)
            calendar_service = CalendarService(conn, PostgresCalendarRepository(conn))
            notes_service = NotesService(conn, PostgresNotesRepository(conn))

            stream = generate_reply_stream_with_tools(
                pairs,
                current_user_id=str(current_user["id"]),
                current_user_timezone=str(current_user.get("timezone") or ""),
                calendar_service=calendar_service,
                notes_service=notes_service,
            )
            for delta in stream:
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
        except OpenAIChatConfigurationError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
            return
        except OpenAIChatCompletionError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
            return
        finally:
            if conn is not None:
                conn.close()
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("", response_model=ChatResponse)
def chat_completion(
    payload: ChatRequest,
    current_user: CurrentUserDep,
    calendar_service: CalendarServiceDep,
    notes_service: NotesServiceDep,
):
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY não configurada.",
        )

    pairs = [(m.role, m.content) for m in payload.messages]
    try:
        reply = generate_reply_with_tools(
            pairs,
            current_user_id=str(current_user["id"]),
            current_user_timezone=str(current_user.get("timezone") or ""),
            calendar_service=calendar_service,
            notes_service=notes_service,
        )
    except OpenAIChatConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except OpenAIChatCompletionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return ChatResponse(reply=reply)
