from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

from llm.model_policy import is_multimodal_openai_realtime_model

VoiceMode = Literal["classic", "openai_realtime"]

DEFAULT_VOICE_MODE: VoiceMode = "classic"
DEFAULT_OPENAI_REALTIME_MODEL = "gpt-realtime-mini"
DEFAULT_OPENAI_REALTIME_VOICE = "marin"
DEFAULT_OPENAI_REALTIME_SPEED = 1.0


@dataclass(frozen=True)
class VoiceRuntimeConfig:
    mode: VoiceMode
    openai_realtime_model: str
    openai_realtime_voice: str
    openai_realtime_speed: float


def _read_voice_mode() -> VoiceMode:
    raw = (os.getenv("KIKI_VOICE_MODE") or DEFAULT_VOICE_MODE).strip().lower()
    if raw == "openai_realtime":
        return "classic"
    if raw in ("classic", "openai_realtime"):
        return raw  # type: ignore[return-value]
    return DEFAULT_VOICE_MODE


def _read_float_env(name: str, default: float) -> float:
    raw = (os.getenv(name) or str(default)).strip()
    try:
        return float(raw)
    except ValueError:
        return default


def _read_realtime_model() -> str:
    configured = (os.getenv("OPENAI_REALTIME_MODEL") or DEFAULT_OPENAI_REALTIME_MODEL).strip()
    if configured and is_multimodal_openai_realtime_model(configured):
        return configured
    return DEFAULT_OPENAI_REALTIME_MODEL


def load_voice_runtime_config() -> VoiceRuntimeConfig:
    return VoiceRuntimeConfig(
        mode=_read_voice_mode(),
        openai_realtime_model=_read_realtime_model(),
        openai_realtime_voice=(
            os.getenv("OPENAI_REALTIME_VOICE") or DEFAULT_OPENAI_REALTIME_VOICE
        ).strip()
        or DEFAULT_OPENAI_REALTIME_VOICE,
        openai_realtime_speed=_read_float_env(
            "OPENAI_REALTIME_SPEED",
            DEFAULT_OPENAI_REALTIME_SPEED,
        ),
    )
