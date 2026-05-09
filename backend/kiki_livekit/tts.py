from __future__ import annotations

import os

from azure_tts_fixed import FixedAzureTTS, locale_from_voice_name

DEFAULT_VOICE = "pt-BR-FranciscaNeural"
DEFAULT_SAMPLE_RATE = 24000


def build_tts() -> FixedAzureTTS:
    voice = (os.getenv("AZURE_TTS_VOICE") or os.getenv("AZURE_VOICE_NAME") or DEFAULT_VOICE).strip() or DEFAULT_VOICE
    language = locale_from_voice_name(voice)

    sample_rate_raw = (os.getenv("AZURE_TTS_SAMPLE_RATE") or str(DEFAULT_SAMPLE_RATE)).strip()
    try:
        sample_rate = int(sample_rate_raw)
    except ValueError:
        sample_rate = DEFAULT_SAMPLE_RATE

    return FixedAzureTTS(voice=voice, language=language, sample_rate=sample_rate)

