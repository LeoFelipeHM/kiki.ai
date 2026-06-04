from __future__ import annotations

from collections.abc import Callable
from typing import Any, cast

import psycopg

from application.agent_plans import AGENT_TYPE_CONFIG, AgentEffort, AgentPlanDraft, AgentType, build_agent_draft
from application.ports import AgentsRepository


class AgentNotFoundError(ValueError):
    pass


class AgentInvalidTransitionError(ValueError):
    pass


class AgentInvalidInputError(ValueError):
    pass


class AgentsService:
    def __init__(
        self,
        conn: psycopg.Connection[Any],
        repo: AgentsRepository,
        plan_builder: Callable[[str, AgentType, AgentEffort], AgentPlanDraft] = build_agent_draft,
    ) -> None:
        self._conn = conn
        self._repo = repo
        self._plan_builder = plan_builder

    def list_agents(self, user_id: str) -> list[dict[str, Any]]:
        return self._repo.list_agents(user_id)

    def create_agent(
        self,
        user_id: str,
        *,
        task: str,
        agent_type: AgentType,
        effort: AgentEffort,
        name: str | None = None,
    ) -> dict[str, Any]:
        task_clean = task.strip()
        if not task_clean:
            raise AgentInvalidInputError("Descreva a tarefa do agente.")

        config = AGENT_TYPE_CONFIG[agent_type]
        draft = self._plan_builder(task_clean, agent_type, effort)
        display_name = (name or draft.title).strip()
        if not display_name:
            display_name = draft.title

        existing = self._repo.list_agents(user_id)
        row = self._repo.create_agent(
            user_id,
            name=display_name,
            agent_type=agent_type,
            task=task_clean,
            effort=effort,
            color=config["color"],
            sort_order=len(existing),
            steps=draft.steps,
        )
        self._conn.commit()
        return row

    def get_agent(self, user_id: str, agent_id: str) -> dict[str, Any]:
        row = self._repo.get_agent(user_id, agent_id)
        if not row:
            raise AgentNotFoundError("Agente não encontrado.")
        return row

    def update_agent_effort(self, user_id: str, agent_id: str, effort: AgentEffort) -> dict[str, Any]:
        current = self.get_agent(user_id, agent_id)
        if current["status"] not in ("planned", "paused"):
            raise AgentInvalidTransitionError("Só é possível alterar o nível antes da execução ou em pausa.")
        steps = None
        if current["status"] == "planned":
            steps = self._plan_builder(str(current["task"]), cast(AgentType, current["type"]), effort).steps
        row = self._repo.update_agent_effort(user_id, agent_id, effort, steps)
        if not row:
            raise AgentNotFoundError("Agente não encontrado.")
        self._conn.commit()
        return row

    def authorize_agent(self, user_id: str, agent_id: str) -> dict[str, Any]:
        current = self.get_agent(user_id, agent_id)
        if current["status"] not in ("planned", "paused", "error"):
            raise AgentInvalidTransitionError("Este agente não pode ser autorizado no estado atual.")
        row = self._repo.set_agent_status(
            user_id,
            agent_id,
            "queued",
            current_action="Aguardando execução",
        )
        assert row is not None
        self._conn.commit()
        return row

    def pause_agent(self, user_id: str, agent_id: str) -> dict[str, Any]:
        current = self.get_agent(user_id, agent_id)
        if current["status"] not in ("queued", "working"):
            raise AgentInvalidTransitionError("Este agente não está em execução.")
        row = self._repo.set_agent_status(
            user_id,
            agent_id,
            "paused",
            current_action="Execução pausada",
        )
        assert row is not None
        self._conn.commit()
        return row

    def resume_agent(self, user_id: str, agent_id: str) -> dict[str, Any]:
        current = self.get_agent(user_id, agent_id)
        if current["status"] != "paused":
            raise AgentInvalidTransitionError("Apenas agentes em pausa podem ser retomados.")
        row = self._repo.set_agent_status(
            user_id,
            agent_id,
            "queued",
            current_action="Aguardando execução",
        )
        assert row is not None
        self._conn.commit()
        return row

    def delete_agent(self, user_id: str, agent_id: str) -> bool:
        ok = self._repo.delete_agent(user_id, agent_id)
        self._conn.commit()
        return ok

    def reorder_agents(self, user_id: str, agent_ids: list[str]) -> list[dict[str, Any]]:
        rows = self._repo.reorder_agents(user_id, agent_ids)
        self._conn.commit()
        return rows

    def list_messages(self, user_id: str, agent_id: str) -> list[dict[str, Any]]:
        rows = self._repo.list_messages(user_id, agent_id)
        if rows is None:
            raise AgentNotFoundError("Agente não encontrado.")
        return rows

    def create_message(self, user_id: str, agent_id: str, content: str) -> dict[str, Any]:
        text = content.strip()
        if not text:
            raise AgentInvalidInputError("Digite uma mensagem para o agente.")
        agent = self.get_agent(user_id, agent_id)
        if agent["status"] in ("queued", "working"):
            raise AgentInvalidTransitionError("Não é possível adicionar instruções durante a execução.")
        row = self._repo.create_message(user_id, agent_id, "user", text)
        if not row:
            raise AgentNotFoundError("Agente não encontrado.")
        if agent["status"] == "completed":
            self._repo.set_agent_status(
                user_id,
                agent_id,
                "queued",
                current_action="Aguardando resposta do agente",
            )
        self._conn.commit()
        return row
