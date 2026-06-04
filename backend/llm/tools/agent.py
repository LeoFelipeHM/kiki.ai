from __future__ import annotations

import json
import os
import random
import time
from collections.abc import Iterator
from typing import Any, Callable, cast

from openai import APIConnectionError, APIStatusError, OpenAI, RateLimitError

from llm.model_policy import coerce_multimodal_openai_model
from llm.prompts.kiki_system import build_kiki_system_instructions
from llm.sanitize import sanitize_reply
from llm.tools.dispatcher import execute_tool_call
from llm.tools.schemas import ToolName, tools_schema_responses

DEFAULT_MODEL = "gpt-5.4-nano"
DEFAULT_MAX_TOOL_TURNS = 6
UsageRecorder = Callable[[dict[str, Any]], None]


class ToolAgentError(Exception):
    pass


def _client(api_key: str | None, *, timeout_seconds: float | None = None) -> OpenAI:
    key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        raise ToolAgentError("OPENAI_API_KEY não configurada.")
    if timeout_seconds is not None and timeout_seconds > 0:
        return OpenAI(api_key=key, timeout=timeout_seconds)
    return OpenAI(api_key=key)


def _responses_model(model: str | None) -> str:
    configured = (
        model
        or os.getenv("OPENAI_RESPONSES_MODEL", "").strip()
        or os.getenv("OPENAI_CHAT_MODEL", "").strip()
        or DEFAULT_MODEL
    ).strip()
    return coerce_multimodal_openai_model(configured, DEFAULT_MODEL)


def _env_int(name: str, fallback: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    try:
        return max(0, int(raw))
    except ValueError:
        return fallback


def _env_float(name: str, fallback: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    try:
        return max(0.0, float(raw))
    except ValueError:
        return fallback


def _web_search_tool(user_timezone: str | None, *, context_size: str | None = None) -> dict[str, Any]:
    tz = (user_timezone or "").strip() or "America/Sao_Paulo"
    ctx = (context_size or os.getenv("OPENAI_WEB_SEARCH_CONTEXT_SIZE") or "medium").strip().lower()
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


def _reasoning_param(model: str, effort: str | None = None) -> dict[str, Any]:
    raw = (effort or os.getenv("OPENAI_REASONING_EFFORT") or "").strip().lower()
    if not raw:
        return {}
    allowed = ("none", "minimal", "low", "medium", "high", "xhigh")
    if raw not in allowed:
        return {}
    return {"reasoning": {"effort": raw}}


def _usage_payload(resp: Any) -> dict[str, Any]:
    usage = getattr(resp, "usage", None)
    if usage is None:
        return {}
    if hasattr(usage, "model_dump"):
        raw = usage.model_dump()
    elif isinstance(usage, dict):
        raw = usage
    else:
        raw = {
            key: getattr(usage, key)
            for key in ("input_tokens", "output_tokens", "total_tokens")
            if hasattr(usage, key)
        }
    return {k: v for k, v in raw.items() if isinstance(v, int | float | str | bool | type(None))}


def _create_response_with_retry(client: OpenAI, kwargs: dict[str, Any]) -> Any:
    retries = _env_int("OPENAI_RATE_LIMIT_MAX_RETRIES", 1)
    base_sleep = _env_float("OPENAI_RATE_LIMIT_BACKOFF_SECONDS", 2.0)
    for attempt in range(retries + 1):
        try:
            return client.responses.create(**kwargs)
        except (RateLimitError, APIConnectionError):
            if attempt >= retries:
                raise
            delay = base_sleep * (2**attempt) + random.uniform(0.0, min(1.0, base_sleep))
            time.sleep(delay)
        except APIStatusError as exc:
            status_code = int(getattr(exc, "status_code", 0) or 0)
            if status_code not in (408, 409, 429) and status_code < 500:
                raise
            if attempt >= retries:
                raise
            delay = base_sleep * (2**attempt) + random.uniform(0.0, min(1.0, base_sleep))
            time.sleep(delay)
    raise ToolAgentError("Falha inesperada ao tentar chamar a OpenAI.")


def run_tool_agent(
    messages: list[tuple[str, str]],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    calendar_service: Any,
    notes_service: Any,
    contacts_service: Any = None,
    agents_service: Any = None,
    friends_service: Any = None,
    current_user_name: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
    additional_system_context: str | None = None,
    latest_input_image_data_url: str | None = None,
    max_tool_turns: int = DEFAULT_MAX_TOOL_TURNS,
    reasoning_effort: str | None = None,
    request_timeout_seconds: float | None = None,
    include_web_search: bool = True,
    web_search_context_size: str | None = None,
    tool_names: set[str] | None = None,
    system_instructions: str | None = None,
    usage_recorder: UsageRecorder | None = None,
) -> str:
    """Responses API: web_search (provedor) + function tools (calendário/notas)."""
    client = _client(api_key, timeout_seconds=request_timeout_seconds)
    mdl = _responses_model(model)

    tools: list[dict[str, Any]] = []
    if include_web_search:
        tools.append(_web_search_tool(current_user_timezone, context_size=web_search_context_size))
    tools.extend(tools_schema_responses(tool_names))

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
        for turn_index in range(max_tool_turns):
            kwargs: dict[str, Any] = {
                "model": mdl,
                "truncation": "auto",
                "parallel_tool_calls": True,
            }
            if tools:
                kwargs["tools"] = tools
            kwargs.update(_reasoning_param(mdl, reasoning_effort))

            if previous_response_id is None:
                instructions = (
                    system_instructions.strip()
                    if system_instructions and system_instructions.strip()
                    else build_kiki_system_instructions(current_user_timezone)
                )
                extra_context = (additional_system_context or "").strip()
                if extra_context:
                    instructions += f"\n\n--- Contexto interno da sessão ---\n{extra_context}\n---"
                kwargs["instructions"] = instructions
                kwargs["input"] = next_input
            else:
                kwargs["previous_response_id"] = previous_response_id
                kwargs["input"] = next_input

            resp = _create_response_with_retry(client, kwargs)

            err = getattr(resp, "error", None)
            if err is not None:
                msg = getattr(err, "message", None) or str(err)
                raise ToolAgentError(msg)

            previous_response_id = resp.id

            calls = [item for item in resp.output if getattr(item, "type", None) == "function_call"]
            if usage_recorder is not None:
                usage_recorder(
                    {
                        "model": mdl,
                        "turn_index": turn_index,
                        "tool_calls": len(calls),
                        "usage": _usage_payload(resp),
                    }
                )

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
                        current_user_name=current_user_name,
                        calendar_service=calendar_service,
                        notes_service=notes_service,
                        contacts_service=contacts_service,
                        agents_service=agents_service,
                        friends_service=friends_service,
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
    agents_service: Any = None,
    friends_service: Any = None,
    current_user_name: str | None = None,
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
        agents_service=agents_service,
        friends_service=friends_service,
        current_user_name=current_user_name,
        api_key=api_key,
        model=model,
        additional_system_context=additional_system_context,
        latest_input_image_data_url=latest_input_image_data_url,
    )
    step = 32
    for i in range(0, len(text), step):
        yield text[i : i + step]
