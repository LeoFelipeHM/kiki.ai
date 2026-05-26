from __future__ import annotations

from kiki_livekit.config import (
    DEFAULT_OPENAI_REALTIME_MODEL,
    DEFAULT_OPENAI_REALTIME_SPEED,
    DEFAULT_OPENAI_REALTIME_VOICE,
    DEFAULT_VOICE_MODE,
    load_voice_runtime_config,
)


def test_voice_runtime_config_defaults(monkeypatch):
    for key in (
        "KIKI_VOICE_MODE",
        "OPENAI_REALTIME_MODEL",
        "OPENAI_REALTIME_VOICE",
        "OPENAI_REALTIME_SPEED",
    ):
        monkeypatch.delenv(key, raising=False)

    config = load_voice_runtime_config()

    assert config.mode == DEFAULT_VOICE_MODE
    assert config.openai_realtime_model == DEFAULT_OPENAI_REALTIME_MODEL
    assert config.openai_realtime_voice == DEFAULT_OPENAI_REALTIME_VOICE
    assert config.openai_realtime_speed == DEFAULT_OPENAI_REALTIME_SPEED


def test_voice_runtime_config_openai_realtime_falls_back_to_classic(monkeypatch):
    monkeypatch.setenv("KIKI_VOICE_MODE", "openai_realtime")
    monkeypatch.setenv("OPENAI_REALTIME_MODEL", "gpt-realtime-mini")
    monkeypatch.setenv("OPENAI_REALTIME_VOICE", "verse")
    monkeypatch.setenv("OPENAI_REALTIME_SPEED", "1.15")

    config = load_voice_runtime_config()

    assert config.mode == "classic"
    assert config.openai_realtime_model == "gpt-realtime-mini"
    assert config.openai_realtime_voice == "verse"
    assert config.openai_realtime_speed == 1.15


def test_voice_runtime_config_realtime_model_falls_back_to_multimodal(monkeypatch):
    monkeypatch.setenv("OPENAI_REALTIME_MODEL", "gpt-3.5-turbo")

    config = load_voice_runtime_config()

    assert config.openai_realtime_model == DEFAULT_OPENAI_REALTIME_MODEL


def test_voice_runtime_config_invalid_mode_falls_back(monkeypatch):
    monkeypatch.setenv("KIKI_VOICE_MODE", "invalid")

    config = load_voice_runtime_config()

    assert config.mode == "classic"
