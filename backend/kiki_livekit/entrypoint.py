from __future__ import annotations

import os

from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, TurnHandlingOptions
from livekit.plugins import silero

from .llm import build_llm
from .stt import build_stt
from .tts import build_tts

load_dotenv()

AGENT_NAME = os.getenv("KIKI_VOICE_AGENT_NAME", "kiki-voice").strip() or "kiki-voice"


class KikiVoiceAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""Você é a Kiki, assistente pessoal por voz no Brasil.
Responda em português do Brasil, em frases curtas e naturais para conversa falada.
Não use markdown, listas numeradas, emojis ou símbolos estranhos.
Seja cordial, objetiva e útil.""",
        )


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def kiki_voice_entrypoint(ctx: JobContext) -> None:
    session = AgentSession(
        stt=build_stt(),
        llm=build_llm(),
        tts=build_tts(),
        vad=silero.VAD.load(activation_threshold=0.3),
        turn_handling=TurnHandlingOptions(
            turn_detection="stt",
            endpointing={"min_delay": 0},
        ),
    )

    await session.start(room=ctx.room, agent=KikiVoiceAssistant())
    await session.generate_reply(
        instructions="Cumprimente brevemente em português do Brasil e pergunte como pode ajudar.",
    )


def run_cli() -> None:
    agents.cli.run_app(server)

