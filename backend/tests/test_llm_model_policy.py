from __future__ import annotations

from types import SimpleNamespace

from llm.model_policy import (
    coerce_multimodal_openai_model,
    is_multimodal_openai_model,
    is_multimodal_openai_realtime_model,
)
from llm.prompts.kiki_system import KIKI_SYSTEM_PROMPT
from llm import openai_chat_client
from llm.tools import agent


def test_prompt_mentions_realtime_camera_access():
    assert "câmera" in KIKI_SYSTEM_PROMPT
    assert "tempo real" in KIKI_SYSTEM_PROMPT
    assert "frame mais recente" in KIKI_SYSTEM_PROMPT


def test_prompt_forbids_filling_gaps_with_guesses():
    assert "Regra anti-invenção" in KIKI_SYSTEM_PROMPT
    assert "Nunca preencha lacunas com suposições" in KIKI_SYSTEM_PROMPT
    assert "compromissos inventados" in KIKI_SYSTEM_PROMPT
    assert "leituras visuais inventadas" in KIKI_SYSTEM_PROMPT


def test_openai_model_policy_accepts_multimodal_models():
    assert is_multimodal_openai_model("gpt-5.4-nano")
    assert is_multimodal_openai_model("gpt-5.4-mini")
    assert is_multimodal_openai_model("gpt-4o-mini")
    assert is_multimodal_openai_realtime_model("gpt-realtime-mini")


def test_openai_model_policy_coerces_text_only_models():
    assert coerce_multimodal_openai_model("gpt-3.5-turbo", "gpt-5.4-nano") == "gpt-5.4-nano"


def test_openai_chat_and_responses_default_to_nano():
    assert openai_chat_client.DEFAULT_MODEL == "gpt-5.4-nano"
    assert agent.DEFAULT_MODEL == "gpt-5.4-nano"


def test_responses_model_uses_multimodal_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_RESPONSES_MODEL", "gpt-3.5-turbo")
    monkeypatch.delenv("OPENAI_CHAT_MODEL", raising=False)

    assert agent._responses_model(None) == agent.DEFAULT_MODEL


def _fake_tool_agent_client(captured: list[dict]):
    class Responses:
        def create(self, **kwargs):
            captured.append(kwargs)
            return SimpleNamespace(
                id="resp_1",
                output=[],
                output_text="ok",
                error=None,
                usage=SimpleNamespace(input_tokens=10, output_tokens=2, total_tokens=12),
            )

    return SimpleNamespace(responses=Responses())


def test_tool_agent_can_use_only_web_search_for_agents(monkeypatch):
    captured: list[dict] = []
    monkeypatch.setattr(agent, "_client", lambda *_args, **_kwargs: _fake_tool_agent_client(captured))

    result = agent.run_tool_agent(
        [("user", "Pesquise preços atuais de notebook")],
        current_user_id="u1",
        current_user_timezone="America/Sao_Paulo",
        calendar_service=None,
        notes_service=None,
        contacts_service=None,
        max_tool_turns=1,
        tool_names=set(),
        web_search_context_size="low",
        system_instructions="Agente compacto.",
    )

    assert result == "ok"
    assert captured[0]["tools"] == [
        {
            "type": "web_search",
            "search_context_size": "low",
            "user_location": {
                "type": "approximate",
                "country": "BR",
                "timezone": "America/Sao_Paulo",
            },
        }
    ]


def test_tool_agent_includes_calendar_tool_when_selected(monkeypatch):
    captured: list[dict] = []
    monkeypatch.setattr(agent, "_client", lambda *_args, **_kwargs: _fake_tool_agent_client(captured))

    agent.run_tool_agent(
        [("user", "Veja minha agenda")],
        current_user_id="u1",
        current_user_timezone="America/Sao_Paulo",
        calendar_service=None,
        notes_service=None,
        contacts_service=None,
        max_tool_turns=1,
        tool_names={"calendar_list_events"},
        web_search_context_size="low",
        system_instructions="Agente compacto.",
    )

    names = [tool.get("name") for tool in captured[0]["tools"] if tool.get("type") == "function"]
    assert names == ["calendar_list_events"]


def test_tool_agent_includes_notes_tool_when_selected(monkeypatch):
    captured: list[dict] = []
    monkeypatch.setattr(agent, "_client", lambda *_args, **_kwargs: _fake_tool_agent_client(captured))

    agent.run_tool_agent(
        [("user", "Consulte minhas notas")],
        current_user_id="u1",
        current_user_timezone="America/Sao_Paulo",
        calendar_service=None,
        notes_service=None,
        contacts_service=None,
        max_tool_turns=1,
        tool_names={"notes_list_notes"},
        web_search_context_size="low",
        system_instructions="Agente compacto.",
    )

    names = [tool.get("name") for tool in captured[0]["tools"] if tool.get("type") == "function"]
    assert names == ["notes_list_notes"]
