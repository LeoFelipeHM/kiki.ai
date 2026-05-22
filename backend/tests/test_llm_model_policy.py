from __future__ import annotations

from llm.model_policy import (
    coerce_multimodal_openai_model,
    is_multimodal_openai_model,
    is_multimodal_openai_realtime_model,
)
from llm.prompts.kiki_system import KIKI_SYSTEM_PROMPT
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
    assert is_multimodal_openai_model("gpt-5.4-mini")
    assert is_multimodal_openai_model("gpt-4o-mini")
    assert is_multimodal_openai_realtime_model("gpt-realtime-mini")


def test_openai_model_policy_coerces_text_only_models():
    assert coerce_multimodal_openai_model("gpt-3.5-turbo", "gpt-5.4-mini") == "gpt-5.4-mini"


def test_responses_model_uses_multimodal_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_RESPONSES_MODEL", "gpt-3.5-turbo")
    monkeypatch.delenv("OPENAI_CHAT_MODEL", raising=False)

    assert agent._responses_model(None) == agent.DEFAULT_MODEL
