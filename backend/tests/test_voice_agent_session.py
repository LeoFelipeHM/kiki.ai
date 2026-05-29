from __future__ import annotations

import inspect
import json

from kiki_livekit import entrypoint
from kiki_livekit.config import VoiceRuntimeConfig
from kiki_livekit.entrypoint import KIKI_VOICE_INSTRUCTIONS, KikiVoiceAssistant, build_agent_session
from kiki_livekit.stt import VOICE_VAD_THRESHOLD
from llm.prompts.kiki_system import KIKI_SYSTEM_PROMPT


class _FakeRealtimeModel:
    calls: list[dict[str, object]] = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.calls.append(kwargs)


class _FakeSession:
    calls: list[dict[str, object]] = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.calls.append(kwargs)


class _FakeDataPacket:
    topic = "kiki.camera.frame"

    def __init__(self, payload: dict[str, object]):
        self.data = json.dumps(payload).encode("utf-8")


def test_openai_realtime_session_uses_realtime_model(monkeypatch):
    _FakeRealtimeModel.calls = []
    _FakeSession.calls = []
    monkeypatch.setattr("kiki_livekit.entrypoint.realtime.RealtimeModel", _FakeRealtimeModel)
    monkeypatch.setattr("kiki_livekit.entrypoint.AgentSession", _FakeSession)

    session = build_agent_session(
        config=VoiceRuntimeConfig(
            mode="openai_realtime",
            openai_realtime_model="gpt-realtime-mini",
            openai_realtime_voice="marin",
            openai_realtime_speed=1.0,
        )
    )

    assert isinstance(session, _FakeSession)
    assert _FakeRealtimeModel.calls[0]["model"] == "gpt-realtime-mini"
    assert _FakeRealtimeModel.calls[0]["voice"] == "marin"
    assert _FakeRealtimeModel.calls[0]["speed"] == 1.0
    assert _FakeRealtimeModel.calls[0]["input_audio_noise_reduction"] == "near_field"
    assert _FakeRealtimeModel.calls[0]["turn_detection"].threshold == VOICE_VAD_THRESHOLD
    assert _FakeRealtimeModel.calls[0]["turn_detection"].create_response is True
    assert _FakeRealtimeModel.calls[0]["turn_detection"].interrupt_response is True
    assert list(_FakeSession.calls[0].keys()) == ["llm"]
    assert isinstance(_FakeSession.calls[0]["llm"], _FakeRealtimeModel)


def test_classic_session_uses_existing_components(monkeypatch):
    _FakeSession.calls = []
    monkeypatch.setattr("kiki_livekit.entrypoint.AgentSession", _FakeSession)
    monkeypatch.setattr("kiki_livekit.entrypoint.build_stt", lambda: "stt")
    monkeypatch.setattr("kiki_livekit.entrypoint.build_llm", lambda: "llm")
    monkeypatch.setattr("kiki_livekit.entrypoint.build_tts", lambda voice_override=None: f"tts:{voice_override}")
    monkeypatch.setattr("kiki_livekit.entrypoint.silero.VAD.load", lambda **kwargs: f"vad:{kwargs['activation_threshold']}")

    session = build_agent_session(
        config=VoiceRuntimeConfig(
            mode="classic",
            openai_realtime_model="gpt-realtime-mini",
            openai_realtime_voice="marin",
            openai_realtime_speed=1.0,
        ),
        voice_override="pt-BR-FranciscaNeural",
    )

    assert isinstance(session, _FakeSession)
    assert _FakeSession.calls[0]["stt"] == "stt"
    assert _FakeSession.calls[0]["llm"] == "llm"
    assert _FakeSession.calls[0]["tts"] == "tts:pt-BR-FranciscaNeural"
    assert _FakeSession.calls[0]["vad"] == f"vad:{VOICE_VAD_THRESHOLD}"


def test_voice_instructions_reuse_main_prompt_with_video_context():
    assert KIKI_VOICE_INSTRUCTIONS.startswith(KIKI_SYSTEM_PROMPT)
    assert "No modo de voz" in KIKI_VOICE_INSTRUCTIONS
    assert "vídeo do usuário" in KIKI_VOICE_INSTRUCTIONS


def test_voice_entrypoint_does_not_generate_initial_greeting():
    source = inspect.getsource(entrypoint.kiki_voice_entrypoint)

    assert "generate_reply" not in source
    assert "Cumprimente" not in source


def test_voice_assistant_accepts_recent_camera_frame():
    assistant = KikiVoiceAssistant(
        user_id="user-1",
        user_timezone="America/Sao_Paulo",
        database_url="postgresql://example",
    )
    image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"

    assistant.remember_camera_frame(
        _FakeDataPacket(
            {
                "type": "camera_frame",
                "image": image,
                "capturedAt": "2026-05-22T10:00:00.000Z",
                "facingMode": "environment",
            }
        )
    )

    assert assistant.has_recent_camera_frame()
    assert assistant.latest_camera_image_data_url() == image


def test_voice_assistant_does_not_use_stale_camera_frame(monkeypatch):
    now = 1000.0
    monkeypatch.setattr(entrypoint.time, "monotonic", lambda: now)
    assistant = KikiVoiceAssistant(
        user_id="user-1",
        user_timezone="America/Sao_Paulo",
        database_url="postgresql://example",
    )
    assistant.remember_camera_frame(
        _FakeDataPacket(
            {
                "type": "camera_frame",
                "image": "data:image/jpeg;base64,/9j/stale",
                "capturedAt": "2026-05-22T10:00:00.000Z",
                "facingMode": "user",
            }
        )
    )

    monkeypatch.setattr(entrypoint.time, "monotonic", lambda: now + 11.0)

    assert not assistant.has_recent_camera_frame()
    assert assistant.latest_camera_image_data_url() is None
