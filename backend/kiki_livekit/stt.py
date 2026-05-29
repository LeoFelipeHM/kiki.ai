from __future__ import annotations

from livekit.plugins import assemblyai

VOICE_VAD_THRESHOLD = 0.65
VOICE_MIN_TURN_SILENCE_MS = 450
VOICE_MAX_TURN_SILENCE_MS = 1200


def build_stt() -> assemblyai.STT:
    return assemblyai.STT(
        model="u3-rt-pro",
        min_turn_silence=VOICE_MIN_TURN_SILENCE_MS,
        max_turn_silence=VOICE_MAX_TURN_SILENCE_MS,
        min_end_of_turn_silence_when_confident=VOICE_MIN_TURN_SILENCE_MS,
        vad_threshold=VOICE_VAD_THRESHOLD,
    )
