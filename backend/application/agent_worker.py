from __future__ import annotations

import os
import re
import time
import threading
from contextvars import ContextVar
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import psycopg
from psycopg.rows import dict_row

from application.calendar_service import CalendarService
from application.contacts_service import ContactsService
from application.notes_service import NotesService
from infrastructure.config import load_settings
from infrastructure.persistence.postgres_agents_repository import PostgresAgentsRepository
from infrastructure.persistence.postgres_calendar_repository import PostgresCalendarRepository
from infrastructure.persistence.postgres_contacts_repository import PostgresContactsRepository
from infrastructure.persistence.postgres_notes_repository import PostgresNotesRepository
from infrastructure.persistence.postgres_usage_repository import PostgresUsageRepository
from llm.openai_chat_client import OpenAIChatCompletionError, OpenAIChatConfigurationError, generate_reply_with_tools

AgentRunner = Callable[[dict[str, Any], list[dict[str, Any]], CalendarService, NotesService, ContactsService], str]
AgentStepRunner = Callable[
    [dict[str, Any], dict[str, Any], list[dict[str, Any]], CalendarService, NotesService, ContactsService],
    str,
]

EFFORT_TO_REASONING = {
    "low": "minimal",
    "medium": "low",
    "high": "medium",
}

DEFAULT_STEP_SECONDS = {
    "low": 4.0,
    "medium": 8.0,
    "high": 14.0,
}

DEFAULT_STEP_TIMEOUT_SECONDS = {
    "low": 45.0,
    "medium": 75.0,
    "high": 120.0,
}

DEFAULT_FINAL_TIMEOUT_SECONDS = {
    "low": 60.0,
    "medium": 120.0,
    "high": 180.0,
}

DEFAULT_STALE_WORKING_SECONDS = 1800.0
DEFAULT_MAX_CALLS_PER_AGENT = 3
DEFAULT_STEP_TOOL_TURNS = 2
DEFAULT_FINAL_TOOL_TURNS = 2
DEFAULT_AGENT_MODEL = "gpt-5.4-nano"
DEFAULT_HIGH_EFFORT_AGENT_MODEL = "gpt-5.4-mini"

AGENT_SYSTEM_INSTRUCTIONS = (
    "Você executa um agente autônomo da Kiki. Responda em português do Brasil, com texto direto, "
    "verificável e compacto. Use ferramentas somente quando forem necessárias para dados atuais ou "
    "dados privados do usuário. Não exponha raciocínio interno. Não invente fatos, preços, horários, "
    "contatos, notas ou compromissos. Para tarefas que exigem encontrar serviços, profissionais, "
    "lojas ou disponibilidade em sites, use web search para descobrir páginas candidatas e depois "
    "web_browse_page para abrir páginas públicas, extrair contatos, links de agendamento e instruções. "
    "Resumos de etapas devem ser curtos; respostas finais devem ser completas e acionáveis."
)

_AGENT_CALL_LOCK = threading.Lock()
_LAST_AGENT_OPENAI_CALL_AT = 0.0


@dataclass
class _AgentOpenAIContext:
    conn: psycopg.Connection[Any]
    usage_repo: PostgresUsageRepository
    agent: dict[str, Any]
    max_calls: int
    calls: int = 0
    phase: str = "agent"
    events: list[dict[str, Any]] = field(default_factory=list)


_OPENAI_CONTEXT: ContextVar[_AgentOpenAIContext | None] = ContextVar("agent_openai_context", default=None)

NON_RECOVERABLE_OPENAI_ERROR_MARKERS = (
    "Limite de chamadas OpenAI por agente excedido",
    "OPENAI_API_KEY não configurada",
)

MARKDOWN_LINK_RE = re.compile(r"!?\[([^\]]*)\]\([^)]+\)")
BARE_URL_RE = re.compile(r"\b(?:https?://|www\.)\S+", re.IGNORECASE)


def _env_float(name: str, fallback: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    try:
        return max(0.0, float(raw))
    except ValueError:
        return fallback


def _env_int(name: str, fallback: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    try:
        return max(0, int(raw))
    except ValueError:
        return fallback


def _step_seconds(effort: str) -> float:
    key = effort if effort in DEFAULT_STEP_SECONDS else "medium"
    env_name = f"AGENT_WORKER_STEP_SECONDS_{key.upper()}"
    return _env_float(env_name, DEFAULT_STEP_SECONDS[key])


def _step_timeout_seconds(effort: str) -> float:
    key = effort if effort in DEFAULT_STEP_TIMEOUT_SECONDS else "medium"
    env_name = f"AGENT_WORKER_STEP_TIMEOUT_SECONDS_{key.upper()}"
    return _env_float(env_name, DEFAULT_STEP_TIMEOUT_SECONDS[key])


def _final_timeout_seconds(effort: str) -> float:
    key = effort if effort in DEFAULT_FINAL_TIMEOUT_SECONDS else "medium"
    env_name = f"AGENT_WORKER_FINAL_TIMEOUT_SECONDS_{key.upper()}"
    return _env_float(env_name, DEFAULT_FINAL_TIMEOUT_SECONDS[key])


def _stale_working_seconds() -> float:
    return _env_float("AGENT_WORKER_STALE_WORKING_SECONDS", DEFAULT_STALE_WORKING_SECONDS)


def _max_calls_per_agent() -> int:
    return _env_int("AGENT_OPENAI_MAX_CALLS_PER_AGENT", DEFAULT_MAX_CALLS_PER_AGENT)


def _max_tool_turns_step() -> int:
    return max(1, _env_int("AGENT_OPENAI_MAX_TOOL_TURNS_STEP", DEFAULT_STEP_TOOL_TURNS))


def _max_tool_turns_final() -> int:
    return max(1, _env_int("AGENT_OPENAI_MAX_TOOL_TURNS_FINAL", DEFAULT_FINAL_TOOL_TURNS))


def _agent_web_search_context_size() -> str:
    value = (os.getenv("AGENT_OPENAI_WEB_SEARCH_CONTEXT_SIZE") or "low").strip().lower()
    return value if value in ("low", "medium", "high") else "low"


def _agent_reasoning_effort(effort: str) -> str:
    key = effort if effort in EFFORT_TO_REASONING else "medium"
    override = os.getenv(f"AGENT_OPENAI_REASONING_EFFORT_{key.upper()}", "").strip().lower()
    if override:
        return override
    return EFFORT_TO_REASONING[key]


def _agent_model(effort: str) -> str:
    key = effort if effort in EFFORT_TO_REASONING else "medium"
    per_effort = os.getenv(f"AGENT_OPENAI_MODEL_{key.upper()}", "").strip()
    if per_effort:
        return per_effort
    if key == "high":
        return os.getenv("AGENT_OPENAI_HIGH_MODEL", "").strip() or DEFAULT_HIGH_EFFORT_AGENT_MODEL
    return os.getenv("AGENT_OPENAI_DEFAULT_MODEL", "").strip() or DEFAULT_AGENT_MODEL


def _throttle_agent_openai_call() -> None:
    global _LAST_AGENT_OPENAI_CALL_AT
    min_seconds = _env_float("AGENT_OPENAI_MIN_SECONDS_BETWEEN_CALLS", 0.0)
    if min_seconds <= 0:
        return
    with _AGENT_CALL_LOCK:
        now = time.monotonic()
        wait = min_seconds - (now - _LAST_AGENT_OPENAI_CALL_AT)
        if wait > 0:
            time.sleep(wait)
        _LAST_AGENT_OPENAI_CALL_AT = time.monotonic()


def _record_agent_openai_usage(event: dict[str, Any]) -> None:
    ctx = _OPENAI_CONTEXT.get()
    if ctx is None:
        return
    metadata = {
        "origin": ctx.phase,
        "agent_id": str(ctx.agent.get("id")),
        "agent_type": ctx.agent.get("type"),
        "effort": ctx.agent.get("effort"),
        "status": "ok",
        **event,
    }
    ctx.events.append(metadata)
    try:
        ctx.usage_repo.insert_event(str(ctx.agent["user_id"]), "chat_completion", metadata)
    except Exception:
        return


def _record_agent_openai_failure(phase: str, exc: Exception) -> None:
    ctx = _OPENAI_CONTEXT.get()
    if ctx is None:
        return
    metadata = {
        "origin": phase,
        "agent_id": str(ctx.agent.get("id")),
        "agent_type": ctx.agent.get("type"),
        "effort": ctx.agent.get("effort"),
        "status": "fallback",
        "error": _shorten(str(exc), 500),
    }
    ctx.events.append(metadata)
    try:
        ctx.usage_repo.insert_event(str(ctx.agent["user_id"]), "chat_completion", metadata)
    except Exception:
        return


def _before_agent_openai_call(phase: str) -> None:
    ctx = _OPENAI_CONTEXT.get()
    if ctx is not None:
        if ctx.calls >= ctx.max_calls:
            raise OpenAIChatCompletionError("Limite de chamadas OpenAI por agente excedido.")
        ctx.calls += 1
        ctx.phase = phase
    _throttle_agent_openai_call()


def _is_recoverable_openai_error(exc: OpenAIChatCompletionError) -> bool:
    message = str(exc)
    return not any(marker in message for marker in NON_RECOVERABLE_OPENAI_ERROR_MARKERS)


def _fallback_step_result(step: dict[str, Any], exc: OpenAIChatCompletionError) -> str:
    description = _shorten(str(step.get("description") or "etapa"), 220)
    reason = _shorten(str(exc), 300)
    return (
        "Etapa concluída com fallback porque a chamada externa falhou ou expirou. "
        f"Etapa: {description}. Limitação registrada: {reason}."
    )


def _fallback_final_result(agent: dict[str, Any], exc: OpenAIChatCompletionError) -> str:
    completed_steps = [
        step
        for step in agent.get("steps", [])
        if str(step.get("status") or "") == "completed" and str(step.get("details") or "").strip()
    ]
    raw_results = [
        item
        for item in agent.get("_raw_step_results", [])
        if isinstance(item, dict) and str(item.get("details") or "").strip()
    ]
    lines = [
        "Não consegui gerar a consolidação final pelo modelo porque a chamada externa falhou ou expirou.",
        f"Tarefa: {_shorten(str(agent.get('task') or 'Sem tarefa informada'), 300)}",
        f"Limitação técnica: {_shorten(str(exc), 300)}",
    ]
    if raw_results:
        lines.append("Achados preservados antes da falha:")
        for item in raw_results[:6]:
            description = _shorten(str(item.get("description") or "Etapa"), 160)
            details = _shorten(str(item.get("details") or ""), 900)
            lines.append(f"- {description}: {details}")
    if completed_steps:
        lines.append("Resumo das etapas:")
        for step in completed_steps[:8]:
            description = _shorten(str(step.get("description") or "Etapa"), 160)
            details = _step_details_summary(str(step.get("details") or ""), 420)
            lines.append(f"- {description}: {details}")
    else:
        lines.append("Nenhuma etapa retornou dados suficientes antes da falha.")
    lines.append("Você pode continuar a conversa com o agente para pedir uma nova tentativa ou restringir a busca.")
    return "\n".join(lines)


def _wait_for_step(repo: PostgresAgentsRepository, agent_id: str, seconds: float) -> bool:
    remaining = seconds
    while remaining > 0:
        if repo.get_agent_status(agent_id) != "working":
            return False
        interval = min(1.0, remaining)
        time.sleep(interval)
        remaining -= interval
    return repo.get_agent_status(agent_id) == "working"


def _format_step_for_context(step: dict[str, Any]) -> str:
    description = _shorten(str(step.get("description") or "Etapa sem descrição"), 180)
    status = str(step.get("status") or "pending")
    details = _step_details_summary(str(step.get("details") or "").strip(), 450)
    if details:
        return f"- {description} ({status}): {details}"
    return f"- {description} ({status})"


def _format_raw_step_for_context(item: dict[str, Any]) -> str:
    description = _shorten(str(item.get("description") or "Etapa"), 180)
    details = _shorten(str(item.get("details") or ""), 1200)
    return f"- {description}: {details}" if details else f"- {description}"


def _shorten(value: str, limit: int = 700) -> str:
    clean = " ".join(value.split())
    if len(clean) <= limit:
        return clean
    return clean[: limit - 1].rstrip() + "…"


def _step_details_summary(value: str | None, limit: int = 220) -> str:
    clean = str(value or "")
    if not clean.strip():
        return ""
    clean = MARKDOWN_LINK_RE.sub(lambda match: match.group(1).strip(), clean)
    clean = BARE_URL_RE.sub("", clean)
    clean = re.sub(r"\(\s*\)", "", clean)
    clean = re.sub(r"\s+([,.;:])", r"\1", clean)
    clean = _shorten(clean, limit).strip(" -")
    return clean or "Etapa concluída."


def _is_planning_step(step: dict[str, Any]) -> bool:
    description = str(step.get("description") or "").strip().lower()
    return description == "planejamento" or description.startswith("planejamento ")


def _local_step_result(step: dict[str, Any]) -> str | None:
    description = str(step.get("description") or "").strip()
    low = description.lower()
    if _is_planning_step(step):
        return "Plano aprovado e execução organizada. Próxima etapa pronta para iniciar."
    local_markers = (
        "entender ",
        "interpretar ",
        "definir termos",
        "separar objetivos",
        "quebrar ",
        "validar coerência",
        "cruzar evidências",
        "procurar inconsistências",
        "refinar a resposta",
        "sintetizar ",
        "consolidar ",
        "montar recomendação final",
        "recomendar ",
    )
    if low.startswith(local_markers) or any(marker in low for marker in (" antes da resposta final", " próximos passos")):
        return f"Etapa tratada localmente para economizar tokens: {description}."
    return None


def _system_context(agent: dict[str, Any], messages: list[dict[str, Any]]) -> str:
    instructions = "\n".join(f"- {_shorten(str(m['content']), 300)}" for m in messages if m["role"] == "user")
    steps = "\n".join(_format_step_for_context(s) for s in agent.get("steps", [])[:8])
    raw_results = [
        item
        for item in agent.get("_raw_step_results", [])
        if isinstance(item, dict) and str(item.get("details") or "").strip()
    ]
    raw_context = "\n".join(_format_raw_step_for_context(item) for item in raw_results[:6])
    return (
        "Você está executando um agente autônomo da Kiki.\n"
        f"Tipo: {agent['type']}.\n"
        f"Nível de pensamento: {agent['effort']}.\n"
        "Execute o pedido, use web search quando pesquisa atual for necessária e use ferramentas "
        "de calendário, notas e contatos quando fizer sentido.\n\n"
        f"Plano aprovado:\n{steps or '- Sem etapas cadastradas'}\n\n"
        f"Achados detalhados para a resposta final:\n{raw_context or '- Nenhum achado detalhado preservado'}\n\n"
        f"Instruções adicionais do usuário:\n{instructions or '- Nenhuma'}"
    )


def _tool_names_for_agent(agent: dict[str, Any], messages: list[dict[str, Any]]) -> set[str]:
    text = " ".join(
        [
            str(agent.get("task") or ""),
            str(agent.get("type") or ""),
            *(str(m.get("content") or "") for m in messages if m.get("role") == "user"),
        ]
    ).lower()
    names: set[str] = set()
    if any(k in text for k in ("agenda", "calend", "compromisso", "evento", "reunião", "reuniao", "horário", "horario")):
        names.update(
            {
                "calendar_list_events",
                "calendar_create_event",
                "calendar_update_event",
                "calendar_delete_event",
            }
        )
    if any(
        k in text
        for k in (
            "site",
            "sites",
            "médico",
            "medico",
            "oftalmo",
            "clínica",
            "clinica",
            "consulta",
            "agendar",
            "marcar",
            "contatar",
            "telefone",
            "whatsapp",
            "endereço",
            "endereco",
            "disponibilidade",
            "horários livres",
            "horarios livres",
        )
    ):
        names.add("web_browse_page")
    if any(k in text for k in ("nota", "notas", "anotação", "anotacao", "lembrete")):
        names.update({"notes_list_notes", "notes_create_note", "notes_update_note", "notes_delete_note"})
    if any(k in text for k in ("contato", "contatos", "email", "e-mail", "convidado", "convidados")):
        names.update(
            {
                "contacts_list_contacts",
                "contacts_create_contact",
                "contacts_update_contact",
                "contacts_delete_contact",
            }
        )
    return names


def _generate_agent_reply(
    *,
    phase: str,
    agent: dict[str, Any],
    messages: list[dict[str, Any]],
    prompt: str,
    calendar_service: CalendarService,
    notes_service: NotesService,
    contacts_service: ContactsService,
    max_tool_turns: int,
    timeout_seconds: float,
) -> str:
    _before_agent_openai_call(phase)
    user_timezone = str(agent.get("user_timezone") or "America/Sao_Paulo")
    return generate_reply_with_tools(
        [("user", prompt)],
        current_user_id=str(agent["user_id"]),
        current_user_timezone=user_timezone,
        calendar_service=calendar_service,
        notes_service=notes_service,
        contacts_service=contacts_service,
        model=_agent_model(str(agent.get("effort"))),
        additional_system_context=_system_context(agent, messages),
        reasoning_effort=_agent_reasoning_effort(str(agent.get("effort"))),
        max_tool_turns=max_tool_turns,
        request_timeout_seconds=timeout_seconds,
        include_web_search=True,
        web_search_context_size=_agent_web_search_context_size(),
        tool_names=_tool_names_for_agent(agent, messages),
        system_instructions=AGENT_SYSTEM_INSTRUCTIONS,
        usage_recorder=_record_agent_openai_usage,
    )


def default_agent_runner(
    agent: dict[str, Any],
    messages: list[dict[str, Any]],
    calendar_service: CalendarService,
    notes_service: NotesService,
    contacts_service: ContactsService,
) -> str:
    prompt = (
        f"Gere uma resposta final completa em português do Brasil a partir das etapas concluídas do agente.\n\n"
        f"Tarefa: {agent['task']}\n\n"
        "A resposta deve ser um texto substancial, explicando o que foi buscado, quais resultados apareceram, "
        "quais limitações existiram e o que o usuário pode fazer em seguida. Sempre que houver mais de uma "
        "alternativa razoável, apresente opções em ordem de prioridade, com prós, contras e recomendação prática. "
        "Se a tarefa envolver profissionais, clínicas, lojas, serviços, agendamento, orçamento ou contato, traga "
        "os contatos encontrados, como telefone, WhatsApp, e-mail, endereço, site oficial ou link de agendamento, "
        "quando esses dados estiverem disponíveis nos achados. Inclua as URLs reais em texto puro para site, "
        "página de contato, página de agendamento e WhatsApp. Quando houver WhatsApp em formato wa.me, "
        "api.whatsapp.com ou telefone identificado como WhatsApp, mostre esse link de WhatsApp junto da opção. "
        "Não oculte links de contato na resposta final. Se não conseguir confirmar horário, preço, vaga ou "
        "disponibilidade, diga claramente que não foi confirmado, mas ainda assim liste as melhores opções e como "
        "contatá-las. Não invente contatos, horários, preços ou disponibilidade."
    )
    return _generate_agent_reply(
        phase="agent_final",
        agent=agent,
        messages=messages,
        prompt=prompt,
        calendar_service=calendar_service,
        notes_service=notes_service,
        contacts_service=contacts_service,
        max_tool_turns=_max_tool_turns_final(),
        timeout_seconds=_final_timeout_seconds(str(agent.get("effort"))),
    )


def default_agent_step_runner(
    agent: dict[str, Any],
    step: dict[str, Any],
    messages: list[dict[str, Any]],
    calendar_service: CalendarService,
    notes_service: NotesService,
    contacts_service: ContactsService,
) -> str:
    local_result = _local_step_result(step)
    if local_result is not None:
        return local_result

    prompt = (
        "Execute somente a etapa atual do agente. Não avance para a próxima etapa e não gere a resposta final.\n\n"
        f"Tarefa principal: {agent['task']}\n"
        f"Etapa atual: {step['description']}\n\n"
        "Retorne apenas um resumo curto e verificável do que foi concluído nesta etapa, sem links."
    )
    return _generate_agent_reply(
        phase="agent_step",
        agent=agent,
        messages=messages,
        prompt=prompt,
        calendar_service=calendar_service,
        notes_service=notes_service,
        contacts_service=contacts_service,
        max_tool_turns=_max_tool_turns_step(),
        timeout_seconds=_step_timeout_seconds(str(agent.get("effort"))),
    )


def execute_claimed_agent(
    conn: psycopg.Connection[Any],
    agent: dict[str, Any],
    *,
    runner: AgentRunner = default_agent_runner,
    step_runner: AgentStepRunner = default_agent_step_runner,
    step_sleep_seconds: float | None = None,
) -> dict[str, Any] | None:
    repo = PostgresAgentsRepository(conn)
    calendar_service = CalendarService(conn, PostgresCalendarRepository(conn))
    notes_service = NotesService(conn, PostgresNotesRepository(conn))
    contacts_service = ContactsService(conn, PostgresContactsRepository(conn))
    usage_repo = PostgresUsageRepository(conn)
    agent_id = str(agent["id"])
    openai_context = _AgentOpenAIContext(
        conn=conn,
        usage_repo=usage_repo,
        agent=agent,
        max_calls=_max_calls_per_agent(),
    )
    context_token = _OPENAI_CONTEXT.set(openai_context)

    try:
        messages = repo.list_messages(str(agent["user_id"]), agent_id) or []
        sleep_seconds = _step_seconds(str(agent.get("effort"))) if step_sleep_seconds is None else step_sleep_seconds
        steps = list(agent.get("steps", []))
        raw_step_results: list[dict[str, str]] = []
        index = 0
        while index < len(steps):
            step = steps[index]
            if step["status"] == "completed":
                index += 1
                continue
            if repo.get_agent_status(agent_id) != "working":
                conn.commit()
                return repo._get_agent_by_id(agent_id)
            repo.mark_step_working(agent_id, str(step["id"]))
            conn.commit()
            if not _wait_for_step(repo, agent_id, sleep_seconds):
                conn.commit()
                return repo._get_agent_by_id(agent_id)
            current_agent = repo._get_agent_by_id(agent_id) or agent

            should_group = (
                step_runner is default_agent_step_runner
                and str(current_agent.get("effort")) in ("low", "medium")
                and _local_step_result(step) is None
            )
            grouped_steps = [step]
            grouped_step = step
            try:
                if should_group:
                    for candidate in steps[index + 1 :]:
                        if candidate["status"] == "completed" or _local_step_result(candidate) is not None:
                            continue
                        grouped_steps.append(candidate)
                    if len(grouped_steps) > 1:
                        for grouped in grouped_steps[1:]:
                            repo.mark_step_working(agent_id, str(grouped["id"]))
                        conn.commit()
                        descriptions = "\n".join(f"- {s['description']}" for s in grouped_steps)
                        grouped_step = {
                            **step,
                            "description": (
                                "Execute estas etapas em uma única chamada econômica, sem gerar a resposta final:\n"
                                f"{descriptions}"
                            ),
                        }
                        step_result = step_runner(
                            current_agent,
                            grouped_step,
                            messages,
                            calendar_service,
                            notes_service,
                            contacts_service,
                        )
                    else:
                        step_result = step_runner(
                            current_agent,
                            step,
                            messages,
                            calendar_service,
                            notes_service,
                            contacts_service,
                        )
                else:
                    step_result = step_runner(current_agent, step, messages, calendar_service, notes_service, contacts_service)
            except OpenAIChatCompletionError as exc:
                if not _is_recoverable_openai_error(exc):
                    raise
                _record_agent_openai_failure("agent_step", exc)
                step_result = _fallback_step_result(grouped_step, exc)

            if repo.get_agent_status(agent_id) != "working":
                conn.commit()
                return repo._get_agent_by_id(agent_id)
            for grouped in grouped_steps:
                if grouped["status"] == "completed":
                    continue
                raw_step_results.append(
                    {
                        "description": str(grouped.get("description") or "Etapa"),
                        "details": str(step_result or ""),
                    }
                )
                details = step_result
                if len(grouped_steps) > 1:
                    details = f"Etapa incluída em execução agrupada: {_shorten(step_result, 500)}"
                repo.complete_step(agent_id, str(grouped["id"]), _step_details_summary(details))
            conn.commit()
            completed_ids = {str(s["id"]) for s in grouped_steps}
            while index < len(steps) and str(steps[index]["id"]) in completed_ids:
                index += 1

        if repo.get_agent_status(agent_id) != "working":
            conn.commit()
            return repo._get_agent_by_id(agent_id)

        repo.mark_agent_finalizing(agent_id)
        conn.commit()

        final_agent = repo._get_agent_by_id(agent_id) or agent
        final_agent = {**final_agent, "_raw_step_results": raw_step_results}
        try:
            result = runner(final_agent, messages, calendar_service, notes_service, contacts_service)
        except OpenAIChatCompletionError as exc:
            if not _is_recoverable_openai_error(exc):
                raise
            _record_agent_openai_failure("agent_final", exc)
            final_agent = {**(repo._get_agent_by_id(agent_id) or final_agent), "_raw_step_results": raw_step_results}
            result = _fallback_final_result(final_agent, exc)

        if repo.get_agent_status(agent_id) != "working":
            conn.commit()
            return repo._get_agent_by_id(agent_id)

        row = repo.complete_agent(agent_id, result)
        if row:
            repo.create_message(str(agent["user_id"]), agent_id, "agent", result)
        conn.commit()
        return row
    except (OpenAIChatConfigurationError, OpenAIChatCompletionError, Exception) as exc:
        conn.rollback()
        repo.fail_agent(agent_id, str(exc))
        conn.commit()
        return repo._get_agent_by_id(agent_id)
    finally:
        _OPENAI_CONTEXT.reset(context_token)


def run_once(*, runner: AgentRunner = default_agent_runner, step_runner: AgentStepRunner = default_agent_step_runner) -> bool:
    settings = load_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL não configurada.")
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        repo = PostgresAgentsRepository(conn)
        if repo.requeue_stale_working(_stale_working_seconds()):
            conn.commit()
        agent = repo.claim_next_queued()
        conn.commit()
        if not agent:
            return False
        execute_claimed_agent(conn, agent, runner=runner, step_runner=step_runner)
        return True


def main() -> None:
    poll_seconds = float(os.getenv("AGENT_WORKER_POLL_SECONDS", "3").strip() or "3")
    while True:
        processed = run_once()
        if not processed:
            time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
