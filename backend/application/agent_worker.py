from __future__ import annotations

import os
import time
from collections.abc import Callable
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
from llm.openai_chat_client import OpenAIChatCompletionError, OpenAIChatConfigurationError, generate_reply_with_tools

AgentRunner = Callable[[dict[str, Any], list[dict[str, Any]], CalendarService, NotesService, ContactsService], str]
AgentStepRunner = Callable[
    [dict[str, Any], dict[str, Any], list[dict[str, Any]], CalendarService, NotesService, ContactsService],
    str,
]

EFFORT_TO_REASONING = {
    "low": "low",
    "medium": "medium",
    "high": "high",
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


def _env_float(name: str, fallback: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    try:
        return max(0.0, float(raw))
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
    description = str(step.get("description") or "Etapa sem descrição")
    status = str(step.get("status") or "pending")
    details = str(step.get("details") or "").strip()
    if details:
        return f"- {description} ({status}): {details}"
    return f"- {description} ({status})"


def _is_planning_step(step: dict[str, Any]) -> bool:
    description = str(step.get("description") or "").strip().lower()
    return description == "planejamento" or description.startswith("planejamento ")


def _system_context(agent: dict[str, Any], messages: list[dict[str, Any]]) -> str:
    instructions = "\n".join(f"- {m['content']}" for m in messages if m["role"] == "user")
    steps = "\n".join(_format_step_for_context(s) for s in agent.get("steps", []))
    return (
        "Você está executando um agente autônomo da Kiki.\n"
        f"Tipo: {agent['type']}.\n"
        f"Nível de pensamento: {agent['effort']}.\n"
        "Execute o pedido, use web search quando pesquisa atual for necessária e use ferramentas "
        "de calendário, notas e contatos quando fizer sentido.\n\n"
        f"Plano aprovado:\n{steps or '- Sem etapas cadastradas'}\n\n"
        f"Instruções adicionais do usuário:\n{instructions or '- Nenhuma'}"
    )


def default_agent_runner(
    agent: dict[str, Any],
    messages: list[dict[str, Any]],
    calendar_service: CalendarService,
    notes_service: NotesService,
    contacts_service: ContactsService,
) -> str:
    user_timezone = str(agent.get("user_timezone") or "America/Sao_Paulo")
    prompt = (
        f"Gere a resposta final em português do Brasil a partir das etapas concluídas do agente.\n\n"
        f"Tarefa: {agent['task']}\n\n"
        "A resposta deve consolidar o que foi apurado nas etapas, ser direta, acionável e mencionar "
        "quando alguma limitação impedir uma conclusão."
    )
    return generate_reply_with_tools(
        [("user", prompt)],
        current_user_id=str(agent["user_id"]),
        current_user_timezone=user_timezone,
        calendar_service=calendar_service,
        notes_service=notes_service,
        contacts_service=contacts_service,
        additional_system_context=_system_context(agent, messages),
        reasoning_effort=EFFORT_TO_REASONING.get(str(agent.get("effort")), "medium"),
        max_tool_turns=4,
        request_timeout_seconds=_final_timeout_seconds(str(agent.get("effort"))),
    )


def default_agent_step_runner(
    agent: dict[str, Any],
    step: dict[str, Any],
    messages: list[dict[str, Any]],
    calendar_service: CalendarService,
    notes_service: NotesService,
    contacts_service: ContactsService,
) -> str:
    if _is_planning_step(step):
        return "Plano aprovado e execução organizada. Próxima etapa pronta para iniciar."

    user_timezone = str(agent.get("user_timezone") or "America/Sao_Paulo")
    prompt = (
        "Execute somente a etapa atual do agente. Não avance para a próxima etapa e não gere a resposta final.\n\n"
        f"Tarefa principal: {agent['task']}\n"
        f"Etapa atual: {step['description']}\n\n"
        "Retorne um resumo curto e verificável do que foi concluído nesta etapa."
    )
    return generate_reply_with_tools(
        [("user", prompt)],
        current_user_id=str(agent["user_id"]),
        current_user_timezone=user_timezone,
        calendar_service=calendar_service,
        notes_service=notes_service,
        contacts_service=contacts_service,
        additional_system_context=_system_context(agent, messages),
        reasoning_effort=EFFORT_TO_REASONING.get(str(agent.get("effort")), "medium"),
        max_tool_turns=3,
        request_timeout_seconds=_step_timeout_seconds(str(agent.get("effort"))),
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
    agent_id = str(agent["id"])

    try:
        messages = repo.list_messages(str(agent["user_id"]), agent_id) or []
        sleep_seconds = _step_seconds(str(agent.get("effort"))) if step_sleep_seconds is None else step_sleep_seconds
        for step in agent.get("steps", []):
            if step["status"] == "completed":
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
            step_result = step_runner(current_agent, step, messages, calendar_service, notes_service, contacts_service)
            if repo.get_agent_status(agent_id) != "working":
                conn.commit()
                return repo._get_agent_by_id(agent_id)
            repo.complete_step(agent_id, str(step["id"]), step_result)
            conn.commit()

        if repo.get_agent_status(agent_id) != "working":
            conn.commit()
            return repo._get_agent_by_id(agent_id)

        repo.mark_agent_finalizing(agent_id)
        conn.commit()

        final_agent = repo._get_agent_by_id(agent_id) or agent
        result = runner(final_agent, messages, calendar_service, notes_service, contacts_service)

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
