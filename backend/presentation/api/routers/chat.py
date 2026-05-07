import json
import os

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from llm.gemini_client import (
    GeminiCompletionError,
    GeminiConfigurationError,
    generate_reply,
    generate_reply_stream,
)
from presentation.api.dependencies import CurrentUserDep
from presentation.api.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
def chat_completion_stream(
    payload: ChatRequest,
    _current_user: CurrentUserDep,
):
    """Resposta em SSE (`text/event-stream`): eventos `data: {"delta":"..."}` e final `data: [DONE]`."""
    if not os.getenv("GEMINI_API_KEY", "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY não configurada.",
        )

    pairs = [(m.role, m.content) for m in payload.messages]

    def sse():
        try:
            for delta in generate_reply_stream(pairs):
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
        except GeminiConfigurationError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
            return
        except GeminiCompletionError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
            return
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
    _current_user: CurrentUserDep,
):
    pairs = [(m.role, m.content) for m in payload.messages]
    try:
        reply = generate_reply(pairs)
    except GeminiConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except GeminiCompletionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return ChatResponse(reply=reply)
