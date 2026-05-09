from __future__ import annotations

from livekit.plugins import assemblyai


def build_stt() -> assemblyai.STT:
    return assemblyai.STT(
        model="u3-rt-pro",
        min_turn_silence=100,
        max_turn_silence=1000,
        vad_threshold=0.3,
    )

