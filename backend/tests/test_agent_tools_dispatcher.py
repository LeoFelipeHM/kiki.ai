from __future__ import annotations

from typing import Any

from llm.tools.dispatcher import execute_tool_call
from llm.tools.schemas import tools_schema_responses


class _AgentsService:
    def __init__(self) -> None:
        self.authorized_id: str | None = None
        self.created_count = 0
        self.messages: list[dict[str, str]] = []
        self.rows = [
            {
                "id": "agent-1",
                "name": "Encontrar oftalmologista",
                "task": "Encontrar médico oftalmologista",
                "status": "planned",
                "type": "research",
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
        self.created_count += 1
        row = dict(self.rows[0])
        row["name"] = "Título gerado pela IA"
        row["task"] = task
        return row

    def create_message(self, user_id: str, agent_id: str, content: str) -> dict[str, Any]:
        row = {"id": f"m-{len(self.messages)}", "agent_id": agent_id, "content": content}
        self.messages.append(row)
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
    assert result["data"][0]["name"] == "Encontrar oftalmologista"
    assert "id" not in result["data"][0]


def test_agent_create_tool_returns_title_without_id() -> None:
    agents = _AgentsService()

    result = _call("agents_create_agent", {"task": "Pesquisar notebook", "type": "shopping"}, agents)

    assert result["ok"] is True
    assert result["data"]["name"] == "Título gerado pela IA"
    assert "id" not in result["data"]


def test_agent_authorize_tool_resolves_by_name() -> None:
    agents = _AgentsService()

    result = _call("agents_authorize_agent", {"agent_name": "encontrar oftalmologista"}, agents)

    assert result["ok"] is True
    assert agents.authorized_id == "agent-1"
    assert result["data"]["name"] == "Encontrar oftalmologista"
    assert "id" not in result["data"]


def test_agent_add_instruction_updates_existing_agent_without_creating_duplicate() -> None:
    agents = _AgentsService()

    result = _call("agents_add_instruction", {"instruction": "Filtre apenas médicos da Unimed."}, agents)

    assert result["ok"] is True
    assert agents.created_count == 0
    assert agents.messages == [{"id": "m-0", "agent_id": "agent-1", "content": "Filtre apenas médicos da Unimed."}]
    assert result["data"]["instruction_added"] is True
    assert result["data"]["name"] == "Encontrar oftalmologista"
    assert "id" not in result["data"]


def test_agent_add_instruction_asks_when_multiple_editable_agents() -> None:
    agents = _AgentsService()
    agents.rows.append(
        {
            **agents.rows[0],
            "id": "agent-2",
            "name": "Comprar notebook",
            "task": "Comparar notebooks",
        }
    )

    result = _call("agents_add_instruction", {"instruction": "Filtre apenas Unimed."}, agents)

    assert result["ok"] is False
    assert "Qual agente devo corrigir" in result["error"]
    assert agents.created_count == 0
    assert agents.messages == []


def test_web_browse_tool_returns_public_page_extract(monkeypatch: Any) -> None:
    def fake_browse(url: str) -> dict[str, Any]:
        return {
            "url": url,
            "status": "ok",
            "contacts": {"phones": ["11 99999-0000"], "emails": [], "whatsapp_links": []},
            "appointment_or_contact_links": [{"text": "Agendar consulta", "url": f"{url}/agenda"}],
        }

    monkeypatch.setattr("llm.tools.dispatcher.browse_public_page", fake_browse)

    result = execute_tool_call(
        "web_browse_page",  # type: ignore[arg-type]
        {"url": "https://clinic.example"},
        current_user_id="u1",
        current_user_timezone="America/Sao_Paulo",
        calendar_service=None,
        notes_service=None,
        contacts_service=None,
        agents_service=None,
    )

    assert result["ok"] is True
    assert result["data"]["contacts"]["phones"] == ["11 99999-0000"]
    assert result["data"]["appointment_or_contact_links"][0]["text"] == "Agendar consulta"


def test_web_browse_schema_can_be_selected_alone() -> None:
    schemas = tools_schema_responses({"web_browse_page"})

    assert [schema["name"] for schema in schemas] == ["web_browse_page"]


def test_agent_add_instruction_schema_can_be_selected_alone() -> None:
    schemas = tools_schema_responses({"agents_add_instruction"})

    assert [schema["name"] for schema in schemas] == ["agents_add_instruction"]
