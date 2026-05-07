from __future__ import annotations

import os
from collections.abc import Iterator

from google import genai
from google.genai import types

from llm.prompts.kiki_system import KIKI_SYSTEM_PROMPT

DEFAULT_MODEL = "gemini-3.1-flash-lite-preview"


class GeminiConfigurationError(Exception):
    """Configuração ausente (ex.: API key)."""


class GeminiCompletionError(Exception):
    """Falha na chamada ao modelo ou resposta inutilizável."""


def generate_reply(
    messages: list[tuple[str, str]],
    *,
    api_key: str | None = None,
    model: str | None = None,
) -> str:
    """Gera a próxima resposta do assistente.

    `messages` é uma lista ordenada de (role, content), onde role ∈ {\"user\", \"assistant\"}.
    Na API Gemini, mensagens do assistente são enviadas como role \"model\".
    """
    key = (api_key or os.getenv("GEMINI_API_KEY") or "").strip()
    if not key:
        raise GeminiConfigurationError("GEMINI_API_KEY não configurada.")

    mdl = (model or os.getenv("GEMINI_MODEL") or DEFAULT_MODEL).strip()
    system_instruction = KIKI_SYSTEM_PROMPT

    contents: list[types.Content] = []
    for role, text in messages:
        gemini_role = "user" if role == "user" else "model"
        contents.append(types.Content(role=gemini_role, parts=[types.Part.from_text(text=text)]))

    client = genai.Client(api_key=key)
    try:
        response = client.models.generate_content(
            model=mdl,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
    except Exception as exc:
        raise GeminiCompletionError(str(exc)) from exc

    raw = (getattr(response, "text", None) or "").strip()
    if not raw:
        raise GeminiCompletionError("Resposta vazia do modelo.")
    return raw


def generate_reply_stream(
    messages: list[tuple[str, str]],
    *,
    api_key: str | None = None,
    model: str | None = None,
) -> Iterator[str]:
    """Emite trechos de texto conforme o modelo gera (streaming)."""
    key = (api_key or os.getenv("GEMINI_API_KEY") or "").strip()
    if not key:
        raise GeminiConfigurationError("GEMINI_API_KEY não configurada.")

    mdl = (model or os.getenv("GEMINI_MODEL") or DEFAULT_MODEL).strip()
    system_instruction = KIKI_SYSTEM_PROMPT

    contents: list[types.Content] = []
    for role, text in messages:
        gemini_role = "user" if role == "user" else "model"
        contents.append(types.Content(role=gemini_role, parts=[types.Part.from_text(text=text)]))

    client = genai.Client(api_key=key)
    try:
        stream = client.models.generate_content_stream(
            model=mdl,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
    except Exception as exc:
        raise GeminiCompletionError(str(exc)) from exc

    emitted = False
    try:
        for chunk in stream:
            piece = getattr(chunk, "text", None) or ""
            if piece:
                emitted = True
                yield piece
    except Exception as exc:
        raise GeminiCompletionError(str(exc)) from exc

    if not emitted:
        raise GeminiCompletionError("Resposta vazia do modelo.")
