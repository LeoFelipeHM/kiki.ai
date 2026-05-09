import json
import os

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from llm.openai_chat_client import (
    OpenAIChatCompletionError,
    OpenAIChatConfigurationError,
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
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY não configurada.",
        )

    pairs = [(m.role, m.content) for m in payload.messages]

    def sse():
        try:
            for delta in generate_reply_stream(pairs):
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
        except OpenAIChatConfigurationError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
            return
        except OpenAIChatCompletionError as exc:
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
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY não configurada.",
        )

    pairs = [(m.role, m.content) for m in payload.messages]
    try:
        reply = generate_reply(pairs)
    except OpenAIChatConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except OpenAIChatCompletionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return ChatResponse(reply=reply)
