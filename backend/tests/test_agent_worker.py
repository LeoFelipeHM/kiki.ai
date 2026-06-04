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
    assert observed["model"] == "gpt-5.4-mini"
    assert observed["reasoning_effort"] == "medium"
    assert observed["max_tool_turns"] == 2
    assert observed["request_timeout_seconds"] == 120.0
    assert observed["web_search_context_size"] == "low"
    assert observed["system_instructions"] == agent_worker.AGENT_SYSTEM_INSTRUCTIONS


def test_medium_effort_agent_uses_nano_model(monkeypatch: Any) -> None:
    observed: dict[str, Any] = {}

    def fake_generate_reply_with_tools(*_: Any, **kwargs: Any) -> str:
        observed.update(kwargs)
        return "Pesquisa concluída."

    agent = _agent()
    agent["effort"] = "medium"
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
    assert observed["model"] == "gpt-5.4-nano"
    assert observed["reasoning_effort"] == "low"


def test_local_review_step_does_not_call_external_runner(monkeypatch: Any) -> None:
    def fail_external_call(*_: Any, **__: Any) -> str:
        raise AssertionError("Etapa local não deve chamar OpenAI.")

    monkeypatch.setattr(agent_worker, "generate_reply_with_tools", fail_external_call)

    result = agent_worker.default_agent_step_runner(
        _agent(),
        {"id": "r1", "description": "Validar coerência dos achados antes da resposta final"},
        [],
        _Service(),
        _Service(),
        _Service(),
    )

    assert result.startswith("Etapa tratada localmente")


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


def test_worker_saves_short_step_details_without_links(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    state["agent"]["steps"] = [
        {"id": "s1", "description": "Coletar informações relevantes", "status": "pending"},
    ]
    _patch_worker(monkeypatch, state)

    def step_with_links(*_: Any) -> str:
        return (
            "Consultei a Clínica A ([site oficial](https://clinica.example/agendar)) e comparei com "
            "https://doctoralia.example/perfil. O resumo ficou muito longo " + ("com detalhes " * 40)
        )

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=lambda *_: "Resposta final",
        step_runner=step_with_links,
        step_sleep_seconds=0,
    )

    details = state["agent"]["steps"][0]["details"]
    assert result is not None
    assert result["status"] == "completed"
    assert "http" not in details
    assert "site oficial" in details
    assert len(details) <= 220


def test_worker_preserves_raw_step_results_for_final_answer(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    state["agent"]["task"] = "Achar oftalmologista com contato por WhatsApp"
    state["agent"]["steps"] = [
        {"id": "s1", "description": "Coletar opções com contato", "status": "pending"},
    ]
    _patch_worker(monkeypatch, state)

    raw = "Clínica A: WhatsApp https://wa.me/5541999999999, telefone (41) 99999-9999, site https://clinica.example"
    observed: dict[str, Any] = {}

    def final_runner(agent: dict[str, Any], *_: Any) -> str:
        observed["raw"] = agent.get("_raw_step_results")
        return "Resposta final com contatos."

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=final_runner,
        step_runner=lambda *_: raw,
        step_sleep_seconds=0,
    )

    assert result is not None
    assert result["status"] == "completed"
    assert "https://" not in state["agent"]["steps"][0]["details"]
    assert observed["raw"][0]["details"] == raw


def test_default_final_runner_requests_complete_answer_with_contacts(monkeypatch: Any) -> None:
    observed: dict[str, Any] = {}

    def fake_generate_reply_with_tools(messages: list[tuple[str, str]], **kwargs: Any) -> str:
        observed["prompt"] = messages[0][1]
        observed["context"] = kwargs["additional_system_context"]
        return "Resposta final detalhada."

    agent = _agent()
    agent["task"] = "Encontrar médico e trazer contato"
    agent["_raw_step_results"] = [
        {
            "description": "Pesquisar clínicas",
            "details": "Clínica A com WhatsApp https://wa.me/5541999999999 e telefone (41) 99999-9999.",
        }
    ]
    monkeypatch.setattr(agent_worker, "generate_reply_with_tools", fake_generate_reply_with_tools)

    result = agent_worker.default_agent_runner(agent, [], _Service(), _Service(), _Service())

    assert result == "Resposta final detalhada."
    assert "texto substancial" in observed["prompt"]
    assert "contatos encontrados" in observed["prompt"]
    assert "Inclua as URLs reais em texto puro" in observed["prompt"]
    assert "mostre esse link de WhatsApp" in observed["prompt"]
    assert "Não oculte links de contato" in observed["prompt"]
    assert "Se não conseguir confirmar horário" in observed["prompt"]
    assert "https://wa.me/5541999999999" in observed["context"]


def test_worker_enforces_openai_call_budget(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    state["agent"]["steps"] = [
        {"id": "s1", "description": "Coletar informações relevantes", "status": "pending"},
    ]
    _patch_worker(monkeypatch, state)
    monkeypatch.setenv("AGENT_OPENAI_MAX_CALLS_PER_AGENT", "1")

    calls = 0

    def fake_generate_reply_with_tools(*_: Any, **__: Any) -> str:
        nonlocal calls
        calls += 1
        return f"resposta {calls}"

    monkeypatch.setattr(agent_worker, "generate_reply_with_tools", fake_generate_reply_with_tools)

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        step_sleep_seconds=0,
    )

    assert result is not None
    assert result["status"] == "error"
    assert result["error_message"] == "Limite de chamadas OpenAI por agente excedido."
    assert calls == 1


def test_worker_groups_low_medium_openai_steps(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    state["agent"]["effort"] = "medium"
    state["agent"]["steps"] = [
        {"id": "s1", "description": "Coletar informações relevantes", "status": "pending"},
        {"id": "s2", "description": "Comparar alternativas por custo e benefício", "status": "pending"},
    ]
    _patch_worker(monkeypatch, state)

    prompts: list[str] = []

    def fake_generate_reply_with_tools(messages: list[tuple[str, str]], **__: Any) -> str:
        prompts.append(messages[0][1])
        return "execução agrupada"

    monkeypatch.setattr(agent_worker, "generate_reply_with_tools", fake_generate_reply_with_tools)

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=lambda *_: "Resposta final",
        step_sleep_seconds=0,
    )

    assert result is not None
    assert result["status"] == "completed"
    assert len(prompts) == 1
    assert "Coletar informações relevantes" in prompts[0]
    assert "Comparar alternativas por custo e benefício" in prompts[0]
    assert all(step["status"] == "completed" for step in state["agent"]["steps"])


def test_worker_continues_when_step_openai_timeout(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    state["agent"]["steps"] = [
        {"id": "s1", "description": "Coletar informações relevantes", "status": "pending"},
    ]
    _patch_worker(monkeypatch, state)

    def timeout_step(*_: Any) -> str:
        raise agent_worker.OpenAIChatCompletionError("Request timed out.")

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=lambda *_: "Resposta final mesmo com fallback.",
        step_runner=timeout_step,
        step_sleep_seconds=0,
    )

    assert result is not None
    assert result["status"] == "completed"
    assert result["results"] == "Resposta final mesmo com fallback."
    assert state["agent"]["steps"][0]["status"] == "completed"
    assert "fallback" in state["agent"]["steps"][0]["details"]
    assert "Request timed out" in state["agent"]["steps"][0]["details"]


def test_worker_uses_local_final_fallback_when_final_openai_timeout(monkeypatch: Any) -> None:
    state = {"agent": _agent(), "messages": []}
    _patch_worker(monkeypatch, state)

    def timeout_final(*_: Any) -> str:
        raise agent_worker.OpenAIChatCompletionError("The request timed out.")

    result = agent_worker.execute_claimed_agent(
        _Conn(),
        state["agent"],
        runner=timeout_final,
        step_runner=_step_runner,
        step_sleep_seconds=0,
    )

    assert result is not None
    assert result["status"] == "completed"
    assert "Não consegui gerar a consolidação final" in result["results"]
    assert "Achados preservados antes da falha" in result["results"]
    assert "Resumo das etapas" in result["results"]
    assert state["messages"][-1]["role"] == "agent"
    assert state["messages"][-1]["content"] == result["results"]


def test_appointment_agent_enables_calendar_and_site_browsing_tools() -> None:
    agent = _agent()
    agent["task"] = "Marcar um oftalmologista para mim, olhando minha agenda e sites de clínicas."

    names = agent_worker._tool_names_for_agent(agent, [])

    assert "calendar_list_events" in names
    assert "web_browse_page" in names


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
