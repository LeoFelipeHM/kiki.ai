from __future__ import annotations

import json
import os
from collections.abc import Iterator
from typing import Any, cast

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError

from llm.prompts.kiki_system import build_kiki_system_instructions
from llm.sanitize import sanitize_reply
from llm.tools.dispatcher import execute_tool_call
from llm.tools.schemas import ToolName, tools_schema_responses

DEFAULT_MODEL = "gpt-5.4-mini"
DEFAULT_MAX_TOOL_TURNS = 6


class ToolAgentError(Exception):
    pass


def _client(api_key: str | None) -> OpenAI:
    key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        raise ToolAgentError("OPENAI_API_KEY não configurada.")
    return OpenAI(api_key=key)


def _responses_model(model: str | None) -> str:
    return (
        model
        or os.getenv("OPENAI_RESPONSES_MODEL", "").strip()
        or os.getenv("OPENAI_CHAT_MODEL", "").strip()
        or DEFAULT_MODEL
    ).strip()


def _web_search_tool(user_timezone: str | None) -> dict[str, Any]:
    tz = (user_timezone or "").strip() or "America/Sao_Paulo"
    ctx = (os.getenv("OPENAI_WEB_SEARCH_CONTEXT_SIZE") or "medium").strip().lower()
    if ctx not in ("low", "medium", "high"):
        ctx = "medium"
    return {
        "type": "web_search",
        "search_context_size": ctx,
        "user_location": {
            "type": "approximate",
            "country": (os.getenv("OPENAI_WEB_SEARCH_COUNTRY") or "BR").strip() or "BR",
            "timezone": tz,
        },
    }


def _reasoning_param(model: str) -> dict[str, Any]:
    raw = (os.getenv("OPENAI_REASONING_EFFORT") or "").strip().lower()
    if not raw:
        return {}
    allowed = ("none", "minimal", "low", "medium", "high", "xhigh")
    if raw not in allowed:
        return {}
    return {"reasoning": {"effort": raw}}


def run_tool_agent(
    messages: list[tuple[str, str]],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    calendar_service: Any,
    notes_service: Any,
    contacts_service: Any = None,
    api_key: str | None = None,
    model: str | None = None,
    additional_system_context: str | None = None,
    latest_input_image_data_url: str | None = None,
    max_tool_turns: int = DEFAULT_MAX_TOOL_TURNS,
) -> str:
    """Responses API: web_search (provedor) + function tools (calendário/notas)."""
    client = _client(api_key)
    mdl = _responses_model(model)

    tools = [_web_search_tool(current_user_timezone)] + tools_schema_responses()

    input_messages: list[dict[str, Any]] = []
    latest_user_index = max((i for i, (role, _text) in enumerate(messages) if role == "user"), default=-1)
    image_data_url = (latest_input_image_data_url or "").strip()
    for i, (role, text) in enumerate(messages):
        r = role if role in ("user", "assistant") else "user"
        clean_text = text.strip()
        if image_data_url and i == latest_user_index and r == "user":
            input_messages.append(
                {
                    "type": "message",
                    "role": r,
                    "content": [
                        {"type": "input_text", "text": clean_text},
                        {"type": "input_image", "image_url": image_data_url, "detail": "low"},
                    ],
                }
            )
        else:
            input_messages.append({"type": "message", "role": r, "content": clean_text})

    if not input_messages:
        input_messages.append(
            {
                "type": "message",
                "role": "user",
                "content": "Inicie a conversa de voz com uma saudação breve.",
            }
        )

    previous_response_id: str | None = None
    next_input: list[dict[str, Any]] = input_messages

    try:
        for _ in range(max_tool_turns):
            kwargs: dict[str, Any] = {
                "model": mdl,
                "tools": tools,
                "truncation": "auto",
                "parallel_tool_calls": True,
            }
            kwargs.update(_reasoning_param(mdl))

            if previous_response_id is None:
                instructions = build_kiki_system_instructions(current_user_timezone)
                extra_context = (additional_system_context or "").strip()
                if extra_context:
                    instructions += f"\n\n--- Contexto interno da sessão ---\n{extra_context}\n---"
                kwargs["instructions"] = instructions
                kwargs["input"] = next_input
            else:
                kwargs["previous_response_id"] = previous_response_id
                kwargs["input"] = next_input

            resp = client.responses.create(**kwargs)

            err = getattr(resp, "error", None)
            if err is not None:
                msg = getattr(err, "message", None) or str(err)
                raise ToolAgentError(msg)

            previous_response_id = resp.id

            calls = [item for item in resp.output if getattr(item, "type", None) == "function_call"]

            if calls:
                outputs: list[dict[str, Any]] = []
                for item in calls:
                    name = cast(ToolName, item.name)
                    try:
                        args = json.loads(item.arguments or "{}")
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
                        contacts_service=contacts_service,
                    )
                    outputs.append(
                        {
                            "type": "function_call_output",
                            "call_id": item.call_id,
                            "output": json.dumps(result, ensure_ascii=False, default=str),
                        }
                    )
                next_input = outputs
                continue

            raw = (resp.output_text or "").strip()
            if raw:
                return sanitize_reply(raw)
            raise ToolAgentError("Resposta vazia do modelo.")
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
    contacts_service: Any = None,
    api_key: str | None = None,
    model: str | None = None,
    additional_system_context: str | None = None,
    latest_input_image_data_url: str | None = None,
) -> Iterator[str]:
    text = run_tool_agent(
        messages,
        current_user_id=current_user_id,
        current_user_timezone=current_user_timezone,
        calendar_service=calendar_service,
        notes_service=notes_service,
        contacts_service=contacts_service,
        api_key=api_key,
        model=model,
        additional_system_context=additional_system_context,
        latest_input_image_data_url=latest_input_image_data_url,
    )
    step = 32
    for i in range(0, len(text), step):
        yield text[i : i + step]
