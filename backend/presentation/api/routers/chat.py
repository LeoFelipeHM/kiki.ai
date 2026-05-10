import json
import os
import queue
import threading
from typing import Annotated, Any

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

# Enquanto o agente (tools + LLM) trabalha sem emitir deltas, proxies costumam cortar a conexão (~60s).
_SSE_KEEPALIVE = float(os.getenv("SSE_KEEPALIVE_SECONDS", "12").strip() or "12")


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
        # Primeiro byte rápido: reduz timeout de “primeira resposta” em proxies e mantém o socket vivo.
        yield ": stream-open\n\n"

        result_queue: queue.Queue[tuple[str, Any]] = queue.Queue()
        worker_conn: list[psycopg.Connection | None] = [None]

        def produce() -> None:
            try:
                worker_conn[0] = psycopg.connect(settings.database_url, row_factory=dict_row)
                conn = worker_conn[0]
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
                    result_queue.put(("delta", delta))
                result_queue.put(("finished", None))
            except OpenAIChatConfigurationError as exc:
                result_queue.put(("config_err", exc))
            except OpenAIChatCompletionError as exc:
                result_queue.put(("chat_err", exc))
            except Exception as exc:
                result_queue.put(("fatal", exc))
            finally:
                c = worker_conn[0]
                if c is not None:
                    try:
                        c.close()
                    except Exception:
                        pass
                    worker_conn[0] = None

        thread = threading.Thread(target=produce, name="chat-sse-producer", daemon=True)
        thread.start()

        try:
            while True:
                try:
                    kind, payload = result_queue.get(timeout=_SSE_KEEPALIVE)
                except queue.Empty:
                    # Comentário SSE: mantém conexão ativa durante execução longa do agente (tools + modelo).
                    yield ": ping\n\n"
                    if not thread.is_alive() and result_queue.empty():
                        yield f"data: {json.dumps({'error': 'Processamento interrompido no servidor.'}, ensure_ascii=False)}\n\n"
                        return
                    continue

                if kind == "delta":
                    yield f"data: {json.dumps({'delta': payload}, ensure_ascii=False)}\n\n"
                elif kind == "finished":
                    break
                elif kind == "config_err":
                    yield f"data: {json.dumps({'error': str(payload)}, ensure_ascii=False)}\n\n"
                    return
                elif kind == "chat_err":
                    yield f"data: {json.dumps({'error': str(payload)}, ensure_ascii=False)}\n\n"
                    return
                elif kind == "fatal":
                    yield f"data: {json.dumps({'error': str(payload)}, ensure_ascii=False)}\n\n"
                    return
        finally:
            thread.join(timeout=600.0)

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
