from __future__ import annotations

import io
import os
from collections.abc import Iterator
from typing import Any

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError

from llm.model_policy import coerce_multimodal_openai_model
from llm.prompts.kiki_system import KIKI_SYSTEM_PROMPT
from llm.sanitize import sanitize_reply
from llm.tools.agent import ToolAgentError, UsageRecorder, run_tool_agent, run_tool_agent_stream

DEFAULT_MODEL = "gpt-5.4-nano"


class OpenAIChatConfigurationError(Exception):
    """Configuração ausente (ex.: API key)."""


class OpenAIChatCompletionError(Exception):
    """Falha na chamada ao modelo ou resposta inutilizável."""


def _client(api_key: str | None) -> OpenAI:
    key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        raise OpenAIChatConfigurationError("OPENAI_API_KEY não configurada.")
    return OpenAI(api_key=key)


def transcribe_whisper_audio(
    audio_bytes: bytes,
    *,
    filename: str = "audio.webm",
    api_key: str | None = None,
) -> str:
    """Transcreve áudio curto via Whisper (chat por voz sem chamada)."""
    bio = io.BytesIO(audio_bytes)
    bio.name = filename
    client = _client(api_key)
    try:
        tr = client.audio.transcriptions.create(
            model="whisper-1",
            file=bio,
            language="pt",
        )
    except (APIConnectionError, APIStatusError, RateLimitError) as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc
    except Exception as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc
    text = (getattr(tr, "text", None) or "").strip()
    if not text:
        raise OpenAIChatCompletionError("Não foi possível reconhecer fala no áudio.")
    return text
def generate_reply_with_tools(
    messages: list[tuple[str, str]],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    calendar_service: Any,
    notes_service: Any,
    contacts_service: Any = None,
    agents_service: Any = None,
    api_key: str | None = None,
    model: str | None = None,
    additional_system_context: str | None = None,
    latest_input_image_data_url: str | None = None,
    reasoning_effort: str | None = None,
    max_tool_turns: int = 6,
    request_timeout_seconds: float | None = None,
    include_web_search: bool = True,
    web_search_context_size: str | None = None,
    tool_names: set[str] | None = None,
    system_instructions: str | None = None,
    usage_recorder: UsageRecorder | None = None,
) -> str:
    """Próxima mensagem do assistente (OpenAI Responses API) com web_search + tool-calling para calendário/notas/contatos."""
    try:
        return run_tool_agent(
            messages,
            current_user_id=current_user_id,
            current_user_timezone=current_user_timezone,
            calendar_service=calendar_service,
            notes_service=notes_service,
            contacts_service=contacts_service,
            agents_service=agents_service,
            api_key=api_key,
            model=model,
            additional_system_context=additional_system_context,
            latest_input_image_data_url=latest_input_image_data_url,
            reasoning_effort=reasoning_effort,
            max_tool_turns=max_tool_turns,
            request_timeout_seconds=request_timeout_seconds,
            include_web_search=include_web_search,
            web_search_context_size=web_search_context_size,
            tool_names=tool_names,
            system_instructions=system_instructions,
            usage_recorder=usage_recorder,
        )
    except ToolAgentError as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc


def generate_reply_stream_with_tools(
    messages: list[tuple[str, str]],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    calendar_service: Any,
    notes_service: Any,
    contacts_service: Any = None,
    agents_service: Any = None,
    api_key: str | None = None,
    model: str | None = None,
    additional_system_context: str | None = None,
    latest_input_image_data_url: str | None = None,
) -> Iterator[str]:
    """Streaming compatível com SSE, após execução de tools (OpenAI Responses API)."""
    try:
        yield from run_tool_agent_stream(
            messages,
            current_user_id=current_user_id,
            current_user_timezone=current_user_timezone,
            calendar_service=calendar_service,
            notes_service=notes_service,
            contacts_service=contacts_service,
            agents_service=agents_service,
            api_key=api_key,
            model=model,
            additional_system_context=additional_system_context,
            latest_input_image_data_url=latest_input_image_data_url,
        )
    except ToolAgentError as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc


def generate_reply(
    messages: list[tuple[str, str]],
    *,
    api_key: str | None = None,
    model: str | None = None,
) -> str:
    """Próxima mensagem do assistente (Chat Completions, texto)."""
    client = _client(api_key)
    mdl = coerce_multimodal_openai_model(
        (model or os.getenv("OPENAI_CHAT_MODEL") or DEFAULT_MODEL).strip(),
        DEFAULT_MODEL,
    )

    oa_messages: list[dict[str, str]] = [{"role": "system", "content": KIKI_SYSTEM_PROMPT}]
    for role, text in messages:
        oa_messages.append({"role": role, "content": text})

    try:
        resp = client.chat.completions.create(
            model=mdl,
            messages=oa_messages,
        )
    except (APIConnectionError, APIStatusError, RateLimitError) as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc
    except Exception as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc

    choice = resp.choices[0].message
    raw = (choice.content or "").strip()
    if not raw:
        raise OpenAIChatCompletionError("Resposta vazia do modelo.")
    return sanitize_reply(raw)


def generate_reply_stream(
    messages: list[tuple[str, str]],
    *,
    api_key: str | None = None,
    model: str | None = None,
) -> Iterator[str]:
    """Trechos de texto conforme o modelo gera (streaming SSE no router)."""
    client = _client(api_key)
    mdl = coerce_multimodal_openai_model(
        (model or os.getenv("OPENAI_CHAT_MODEL") or DEFAULT_MODEL).strip(),
        DEFAULT_MODEL,
    )

    oa_messages: list[dict[str, str]] = [{"role": "system", "content": KIKI_SYSTEM_PROMPT}]
    for role, text in messages:
        oa_messages.append({"role": role, "content": text})

    try:
        stream = client.chat.completions.create(
            model=mdl,
            messages=oa_messages,
            stream=True,
        )
    except (APIConnectionError, APIStatusError, RateLimitError) as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc
    except Exception as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc

    buf: list[str] = []
    try:
        for chunk in stream:
            choice = chunk.choices[0] if chunk.choices else None
            if not choice:
                continue
            delta = choice.delta
            if delta is None:
                continue
            piece = delta.content or ""
            if piece:
                buf.append(piece)
    except (APIConnectionError, APIStatusError, RateLimitError) as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc
    except Exception as exc:
        raise OpenAIChatCompletionError(str(exc)) from exc

    if not buf:
        raise OpenAIChatCompletionError("Resposta vazia do modelo.")

    cleaned = sanitize_reply("".join(buf))
    step = 32
    for i in range(0, len(cleaned), step):
        yield cleaned[i : i + step]
