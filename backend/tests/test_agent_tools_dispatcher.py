from __future__ import annotations

from typing import Any

from llm.tools.dispatcher import execute_tool_call


class _AgentsService:
    def __init__(self) -> None:
        self.authorized_id: str | None = None
        self.rows = [
            {
                "id": "agent-1",
                "name": "Pesquisa de passagens para Paris",
                "task": "Encontrar voos para Paris",
                "status": "planned",
                "type": "travel",
                "effort": "medium",
                "progress": 0,
                "current_action": None,
                "results": None,
                "error_message": None,
                "steps": [{"position": 0, "description": "Planejamento", "status": "pending"}],
            }
        ]

    def list_agents(self, user_id: str) -> list[dict[str, Any]]:
        return self.rows

    def create_agent(self, user_id: str, *, task: str, agent_type: str, effort: str, name: str | None) -> dict[str, Any]:
        row = dict(self.rows[0])
        row["name"] = "Título gerado pela IA"
        row["task"] = task
        return row

    def authorize_agent(self, user_id: str, agent_id: str) -> dict[str, Any]:
        self.authorized_id = agent_id
        row = dict(self.rows[0])
        row["status"] = "queued"
        return row


def _call(name: str, args: dict[str, Any], agents: _AgentsService) -> dict[str, Any]:
    return execute_tool_call(
        name,  # type: ignore[arg-type]
        args,
        current_user_id="u1",
        current_user_timezone="America/Sao_Paulo",
        calendar_service=None,
        notes_service=None,
        contacts_service=None,
        agents_service=agents,
    )


def test_agent_tools_do_not_expose_ids_to_model() -> None:
    agents = _AgentsService()

    result = _call("agents_list_agents", {}, agents)

    assert result["ok"] is True
    assert result["data"][0]["name"] == "Pesquisa de passagens para Paris"
    assert "id" not in result["data"][0]


def test_agent_create_tool_returns_title_without_id() -> None:
    agents = _AgentsService()

    result = _call("agents_create_agent", {"task": "Pesquisar notebook", "type": "shopping"}, agents)

    assert result["ok"] is True
    assert result["data"]["name"] == "Título gerado pela IA"
    assert "id" not in result["data"]


def test_agent_authorize_tool_resolves_by_name() -> None:
    agents = _AgentsService()

    result = _call("agents_authorize_agent", {"agent_name": "pesquisa de passagens para paris"}, agents)

    assert result["ok"] is True
    assert agents.authorized_id == "agent-1"
    assert result["data"]["name"] == "Pesquisa de passagens para Paris"
    assert "id" not in result["data"]
