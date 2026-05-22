from __future__ import annotations

MULTIMODAL_OPENAI_MODEL_PREFIXES = (
    "gpt-5",
    "gpt-4.1",
    "gpt-4o",
    "o4",
    "chatgpt-4o",
)

MULTIMODAL_OPENAI_REALTIME_MODEL_PREFIXES = (
    "gpt-realtime",
)


def is_multimodal_openai_model(model: str) -> bool:
    normalized = model.strip().lower()
    return normalized.startswith(MULTIMODAL_OPENAI_MODEL_PREFIXES)


def is_multimodal_openai_realtime_model(model: str) -> bool:
    normalized = model.strip().lower()
    return normalized.startswith(MULTIMODAL_OPENAI_REALTIME_MODEL_PREFIXES)


def coerce_multimodal_openai_model(model: str, fallback: str) -> str:
    candidate = model.strip()
    if is_multimodal_openai_model(candidate):
        return candidate
    return fallback
