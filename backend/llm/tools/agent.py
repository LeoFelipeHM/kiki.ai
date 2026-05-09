from __future__ import annotations

import json
import logging
import os
from collections.abc import Iterator
from typing import Any, cast

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError

from llm.prompts.kiki_system import KIKI_SYSTEM_PROMPT
from llm.tools.dispatcher import execute_tool_call
from llm.tools.schemas import ToolName, tools_schema

log = logging.getLogger("kiki.llm.agent")

DEFAULT_MODEL = "gpt-5.4-mini"
DEFAULT_MAX_TOOL_TURNS = 6


class ToolAgentError(Exception):
    pass


def _client(api_key: str | None) -> OpenAI:
    key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        raise ToolAgentError("OPENAI_API_KEY não configurada.")
    return OpenAI(api_key=key)


def run_tool_agent(
    messages: list[tuple[str, str]],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    calendar_service: Any,
    notes_service: Any,
    api_key: str | None = None,
    model: str | None = None,
    max_tool_turns: int = DEFAULT_MAX_TOOL_TURNS,
) -> str:
    client = _client(api_key)
    mdl = (model or os.getenv("OPENAI_CHAT_MODEL") or DEFAULT_MODEL).strip()

    oa_messages: list[dict[str, Any]] = [{"role": "system", "content": KIKI_SYSTEM_PROMPT}]
    for role, text in messages:
        oa_messages.append({"role": role, "content": text})

    tools = tools_schema()

    try:
        for _ in range(max_tool_turns):
            resp = client.chat.completions.create(model=mdl, messages=oa_messages, tools=tools)
            choice = resp.choices[0].message
            tool_calls = getattr(choice, "tool_calls", None)

            if tool_calls:
                oa_messages.append({"role": "assistant", "content": choice.content or "", "tool_calls": tool_calls})
                for call in tool_calls:
                    fn = call.function
                    name = cast(ToolName, fn.name)
                    try:
                        args = json.loads(fn.arguments or "{}")
                        if not isinstance(args, dict):
                            args = {}
                    except Exception:
                        args = {}

                    result = execute_tool_call(
                        name,
                        cast(dict[str, Any], args),
                        current_user_id=current_user_id,
                        current_user_timezone=current_user_timezone,
                        calendar_service=calendar_service,
                        notes_service=notes_service,
                    )
                    oa_messages.append(
                        {"role": "tool", "tool_call_id": call.id, "content": json.dumps(result, ensure_ascii=False, default=str)}
                    )
                continue

            raw = (choice.content or "").strip()
            if not raw:
                raise ToolAgentError("Resposta vazia do modelo.")
            return raw
    except (APIConnectionError, APIStatusError, RateLimitError) as exc:
        raise ToolAgentError(str(exc)) from exc
    except ToolAgentError:
        raise
    except Exception as exc:
        raise ToolAgentError(str(exc)) from exc

    raise ToolAgentError("Limite de execuções de ferramentas excedido.")


def run_tool_agent_stream(
    messages: list[tuple[str, str]],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    calendar_service: Any,
    notes_service: Any,
    api_key: str | None = None,
    model: str | None = None,
) -> Iterator[str]:
    text = run_tool_agent(
        messages,
        current_user_id=current_user_id,
        current_user_timezone=current_user_timezone,
        calendar_service=calendar_service,
        notes_service=notes_service,
        api_key=api_key,
        model=model,
    )
    step = 32
    for i in range(0, len(text), step):
        yield text[i : i + step]

