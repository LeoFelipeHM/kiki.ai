from __future__ import annotations

import copy
from typing import Any

import pytest

from application.agents_service import AgentInvalidTransitionError, AgentsService
from application.agent_plans import AgentPlanDraft


def _plan(task: str, agent_type: str, effort: str) -> AgentPlanDraft:
    return AgentPlanDraft(
        title=f"Título IA para {task}",
        steps=[
            "Planejamento",
            f"Pesquisar contexto para {task}",
            f"Executar agente {agent_type}",
            f"Revisar com esforço {effort}",
        ],
    )


class _Conn:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1


class _Repo:
    def __init__(self) -> None:
        self.rows: dict[str, dict[str, Any]] = {}
        self.messages: dict[str, list[dict[str, Any]]] = {}
        self.next_id = 1

    def list_agents(self, user_id: str) -> list[dict[str, Any]]:
        return [copy.deepcopy(v) for v in self.rows.values() if v["user_id"] == user_id]

    def create_agent(self, user_id: str, *, name: str, agent_type: str, task: str, effort: str, color: str, sort_order: int, steps: list[str]) -> dict[str, Any]:
        agent_id = str(self.next_id)
        self.next_id += 1
        row = {
            "id": agent_id,
            "user_id": user_id,
            "name": name,
            "type": agent_type,
            "task": task,
            "status": "planned",
            "effort": effort,
            "progress": 0,
            "color": color,
            "sort_order": sort_order,
            "steps": [
                {"id": f"{agent_id}-{i}", "agent_id": agent_id, "position": i, "description": s, "status": "pending"}
                for i, s in enumerate(steps)
            ],
        }
        self.rows[agent_id] = row
        return copy.deepcopy(row)

    def get_agent(self, user_id: str, agent_id: str) -> dict[str, Any] | None:
        row = self.rows.get(agent_id)
        return copy.deepcopy(row) if row and row["user_id"] == user_id else None

    def update_agent_effort(self, user_id: str, agent_id: str, effort: str, steps: list[str] | None) -> dict[str, Any] | None:
        row = self.rows.get(agent_id)
        if not row or row["user_id"] != user_id:
            return None
        row["effort"] = effort
        if steps is not None:
            row["steps"] = [
                {"id": f"{agent_id}-{i}", "agent_id": agent_id, "position": i, "description": s, "status": "pending"}
                for i, s in enumerate(steps)
            ]
        return copy.deepcopy(row)

    def set_agent_status(self, user_id: str, agent_id: str, status: str, *, current_action: str | None = None) -> dict[str, Any] | None:
        row = self.rows.get(agent_id)
        if not row or row["user_id"] != user_id:
            return None
        row["status"] = status
        row["current_action"] = current_action
        if status == "queued":
            row["progress"] = 0
        return copy.deepcopy(row)

    def delete_agent(self, user_id: str, agent_id: str) -> bool:
        row = self.rows.get(agent_id)
        if not row or row["user_id"] != user_id:
            return False
        del self.rows[agent_id]
        return True

    def reorder_agents(self, user_id: str, agent_ids: list[str]) -> list[dict[str, Any]]:
        for index, agent_id in enumerate(agent_ids):
            if agent_id in self.rows and self.rows[agent_id]["user_id"] == user_id:
                self.rows[agent_id]["sort_order"] = index
        return self.list_agents(user_id)

    def list_messages(self, user_id: str, agent_id: str) -> list[dict[str, Any]] | None:
        if self.get_agent(user_id, agent_id) is None:
            return None
        return copy.deepcopy(self.messages.get(agent_id, []))

    def create_message(self, user_id: str, agent_id: str, role: str, content: str) -> dict[str, Any] | None:
        if self.get_agent(user_id, agent_id) is None:
            return None
        row = {"id": f"m-{len(self.messages.get(agent_id, []))}", "agent_id": agent_id, "user_id": user_id, "role": role, "content": content}
        self.messages.setdefault(agent_id, []).append(row)
        return copy.deepcopy(row)


def test_create_agent_generates_steps_by_type_and_effort() -> None:
    service = AgentsService(_Conn(), _Repo(), plan_builder=_plan)

    row = service.create_agent("u1", task="Pesquisar IA", agent_type="research", effort="high")

    assert row["status"] == "planned"
    assert row["name"] == "Título IA para Pesquisar IA"
    assert row["type"] == "research"
    assert row["effort"] == "high"
    assert len(row["steps"]) == 4
    assert row["steps"][0]["description"] == "Planejamento"
    assert row["steps"][1]["description"] == "Pesquisar contexto para Pesquisar IA"
    assert row["steps"][-1]["description"] == "Revisar com esforço high"


def test_authorize_moves_planned_agent_to_queue() -> None:
    repo = _Repo()
    service = AgentsService(_Conn(), repo, plan_builder=_plan)
    row = service.create_agent("u1", task="Organizar agenda", agent_type="custom", effort="medium")

    authorized = service.authorize_agent("u1", row["id"])

    assert authorized["status"] == "queued"
    assert authorized["current_action"] == "Aguardando execução"


def test_effort_cannot_change_while_working() -> None:
    repo = _Repo()
    service = AgentsService(_Conn(), repo, plan_builder=_plan)
    row = service.create_agent("u1", task="Comprar notebook", agent_type="shopping", effort="low")
    repo.rows[row["id"]]["status"] = "working"

    with pytest.raises(AgentInvalidTransitionError):
        service.update_agent_effort("u1", row["id"], "high")


def test_user_isolation_on_get() -> None:
    service = AgentsService(_Conn(), _Repo(), plan_builder=_plan)
    row = service.create_agent("u1", task="Viagem", agent_type="travel", effort="medium")

    with pytest.raises(Exception):
        service.get_agent("u2", row["id"])
