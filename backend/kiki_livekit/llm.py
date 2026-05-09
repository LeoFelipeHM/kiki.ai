from __future__ import annotations

from livekit.agents import inference


def build_llm() -> inference.LLM:
    return inference.LLM(
        model="openai/gpt-5.4-mini",
        provider="openai",
        extra_kwargs={"reasoning_effort": "low"},
    )

