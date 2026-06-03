from __future__ import annotations

from typing import Any

from application import agent_worker


class _Conn:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


class _Service:
    def __init__(self, *_: Any) -> None:
        pass


class _Repo:
    state: dict[str, Any]

    def __init__(self, *_: Any) -> None:
        self.state = self.__class__.state

    def list_messages(self, user_id: str, agent_id: str) -> list[dict[str, Any]]:
        return self.state.get("messages", [])

    def get_agent_status(self, agent_id: str) -> str:
        return self.state["agent"]["status"]

    def mark_step_working(self, agent_id: str, step_id: str) -> dict[str, Any]:
        step = self._step(step_id)
        step["status"] = "working"
        self.state["agent"]["current_action"] = step["description"]
        return self.state["agent"]

    def complete_step(self, agent_id: str, step_id: str, details: str | None) -> dict[str, Any]:
        step = self._step(step_id)
        step["status"] = "completed"
        step["details"] = details
        total = len(self.state["agent"]["steps"])
        completed = len([s for s in self.state["agent"]["steps"] if s["status"] == "completed"])
        self.state["agent"]["progress"] = min(90, round((completed / total) * 90))
        return self.state["agent"]

    def mark_agent_finalizing(self, agent_id: str) -> dict[str, Any]:
        self.state["agent"]["current_action"] = "Gerando resposta final"
        self.state["agent"]["progress"] = max(self.state["agent"].get("progress", 0), 95)
        return self.state["agent"]

    def complete_agent(self, agent_id: str, results: str) -> dict[str, Any]:
        self.state["agent"]["status"] = "completed"
        self.state["agent"]["progress"] = 100
        self.state["agent"]["results"] = results
        return self.state["agent"]

    def create_message(self, user_id: str, agent_id: str, role: str, content: str) -> dict[str, Any]:
        row = {"id": "m1", "user_id": user_id, "agent_id": agent_id, "role": role, "content": content}
        self.state.setdefault("messages", []).append(row)
        return row

    def fail_agent(self, agent_id: str, message: str) -> dict[str, Any]:
        self.state["agent"]["status"] = "error"
        self.state["agent"]["error_message"] = message
        return self.state["agent"]

    def _get_agent_by_id(self, agent_id: str) -> dict[str, Any]:
        return self.state["agent"]

    def _step(self, step_id: str) -> dict[str, Any]:
        return next(s for s in self.state["agent"]["steps"] if s["id"] == step_id)


def _agent() -> dict[str, Any]:
    return {
        "id": "a1",
        "user_id": "u1",
        "type": "research",
        "task": "Pesquisar algo",
        "status": "working",
        "effort": "medium",
        "steps": [
            {"id": "s1", "description": "Entender objetivo", "status": "pending"},
            {"id": "s2", "description": "Coletar informações relevantes", "status": "pending"},
        ],
    }


def _patch_worker(monkeypatch: Any, state: dict[str, Any]) -> None:
    _Repo.state = state
    monkeypatch.setattr(agent_worker, "PostgresAgentsRepository", _Repo)
    monkeypatch.setattr(agent_worker, "CalendarService", _Service)
    monkeypatch.setattr(agent_worker, "NotesService", _Service)
    monkeypatch.setattr(agent_worker, "ContactsService", _Service)
    monkeypatch.setattr(agent_worker, "PostgresCalendarRepository", _Service)
    monkeypatch.setattr(agent_worker, "PostgresNotesRepository", _Service)
    monkeypatch.setattr(agent_worker, "PostgresContactsRepository", _Service)


def _step_runner(agent: dict[str, Any], step: dict[str, Any], *_: Any) -> str:
    return f"Etapa concluída: {step['description']}"


def test_planning_step_does_not_call_external_runner(monkeypatch: Any) -> None:
    def fail_external_call(*_: Any, **__: Any) -> str:
        raise AssertionError("Planejamento não deve chamar OpenAI nem pesquisa externa.")

    monkeypatch.setattr(agent_worker, "generate_reply_with_tools", fail_external_call)

    result = agent_worker.default_agent_step_runner(
        _agent(),
        {"id": "p1", "description": "Planejamento"},
        [],
        _Service(),
        _Service(),
        _Service(),
    )

    assert result == "Plano aprovado e execução organizada. Próxima etapa pronta para iniciar."


def test_real_step_uses_bounded_tool_execution(monkeypatch: Any) -> None:
    observed: dict[str, Any] = {}

    def fake_generate_reply_with_tools(*_: Any, **kwargs: Any) -> str:
        observed.update(kwargs)
        return "Pesquisa concluída."

    agent = _agent()
    agent["effort"] = "high"
    monkeypatch.setattr(agent_worker, "generate_reply_with_tools", fake_generate_reply_with_tools)

    result = agent_worker.default_agent_step_runner(
        agent,
        {"id": "s1", "description": "Pesquisar contexto atual"},
        [],
        _Service(),
        _Service(),
        _Service(),
    )

    assert result == "Pesquisa concluída."
    assert observed["reasoning_effort"] == "high"
    assert observed["max_tool_turns"] == 3
    assert observed["request_timeout_seconds"] == 120.0


def test_worker_completes_steps_and_saves_result(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    _patch_worker(monkeypatch, state)

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=lambda *_: "Resposta da pesquisa",
        step_runner=_step_runner,
        step_sleep_seconds=0,
    )

    assert result is not None
    assert result["status"] == "completed"
    assert result["progress"] == 100
    assert result["results"] == "Resposta da pesquisa"
    assert state["agent"]["steps"][0]["details"] == "Etapa concluída: Entender objetivo"
    assert state["agent"]["steps"][1]["details"] == "Etapa concluída: Coletar informações relevantes"
    assert state["messages"][-1]["role"] == "agent"


def test_worker_only_starts_next_step_after_current_step_finishes(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    _patch_worker(monkeypatch, state)
    observed: list[tuple[str, str, str]] = []

    def step_runner(agent: dict[str, Any], step: dict[str, Any], *_: Any) -> str:
        observed.append((step["id"], state["agent"]["steps"][0]["status"], state["agent"]["steps"][1]["status"]))
        return f"Finalizou {step['id']}"

    agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=lambda *_: "Resposta da pesquisa",
        step_runner=step_runner,
        step_sleep_seconds=0,
    )

    assert observed == [
        ("s1", "working", "pending"),
        ("s2", "completed", "working"),
    ]


def test_worker_marks_agent_error_when_runner_fails(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    _patch_worker(monkeypatch, state)

    def fail(*_: Any) -> str:
        raise RuntimeError("falha externa")

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=fail,
        step_runner=_step_runner,
        step_sleep_seconds=0,
    )

    assert result is not None
    assert result["status"] == "error"
    assert result["progress"] == 95
    assert result["current_action"] == "Gerando resposta final"
    assert result["error_message"] == "falha externa"
