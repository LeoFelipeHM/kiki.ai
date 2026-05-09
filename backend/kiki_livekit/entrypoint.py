from __future__ import annotations

import os
import re

from dotenv import load_dotenv

import psycopg
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, TurnHandlingOptions, llm
from livekit.plugins import silero
from psycopg.rows import dict_row

from application.calendar_service import CalendarService
from application.notes_service import NotesService
from infrastructure.persistence.postgres_calendar_repository import PostgresCalendarRepository
from infrastructure.persistence.postgres_notes_repository import PostgresNotesRepository
from llm.openai_chat_client import generate_reply_with_tools
from .llm import build_llm
from .stt import build_stt
from .tts import build_tts

load_dotenv()

AGENT_NAME = os.getenv("KIKI_VOICE_AGENT_NAME", "kiki-voice").strip() or "kiki-voice"

_ROOM_PREFIX_RE = re.compile(r"^kiki-(?P<uid>.+)-[0-9a-f]{12}$", re.IGNORECASE)


def _user_id_from_room_name(room_name: str) -> str | None:
    """
    O backend cria salas no formato: kiki-<user_id>-<suffix12>.
    `user_id` pode conter hífens (UUID), por isso o sufixo fixo ajuda a separar.
    """
    m = _ROOM_PREFIX_RE.match(room_name or "")
    return m.group("uid") if m else None


def _fetch_user_timezone(database_url: str, user_id: str) -> str:
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT timezone FROM users WHERE id = %s::uuid", (user_id,))
            row = cur.fetchone()
    tz = (row or {}).get("timezone") if isinstance(row, dict) else None
    return str(tz or "America/Sao_Paulo")


class KikiVoiceAssistant(Agent):
    def __init__(self, *, user_id: str, user_timezone: str, database_url: str) -> None:
        self._user_id = user_id
        self._user_timezone = user_timezone
        self._database_url = database_url
        super().__init__(
            instructions="""Você é a Kiki, assistente pessoal por voz no Brasil.
Responda em português do Brasil, em frases curtas e naturais para conversa falada.
Não use markdown, listas numeradas, emojis ou símbolos estranhos.
Seja cordial, objetiva e útil.

Você tem acesso ao calendário e às notas do usuário autenticado do app Kiki por meio de ferramentas internas.
Não invente compromissos nem horários; consulte quando precisar.""",
        )

    async def llm_node(
        self,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool],
        model_settings: agents.ModelSettings,
    ) -> str:
        # Usa o mesmo agente/tool-calling do backend para ter acesso a eventos/notas também no voice.
        pairs: list[tuple[str, str]] = []
        for msg in chat_ctx.messages():
            role = getattr(msg, "role", None)
            content = getattr(msg, "content", None)
            if role not in ("user", "assistant"):
                continue
            if isinstance(content, str):
                text = content
            elif isinstance(content, list):
                # Em LiveKit Agents, o conteúdo normalmente é uma lista (ex.: ["texto..."])
                parts: list[str] = []
                for c in content:
                    if isinstance(c, str):
                        parts.append(c)
                    else:
                        parts.append(str(c))
                text = " ".join(p for p in parts if p.strip())
            else:
                text = str(content or "")
            text = text.strip()
            if text:
                pairs.append((role, text))

        with psycopg.connect(self._database_url, row_factory=dict_row) as conn:
            calendar_service = CalendarService(conn, PostgresCalendarRepository(conn))
            notes_service = NotesService(conn, PostgresNotesRepository(conn))
            reply = generate_reply_with_tools(
                pairs,
                current_user_id=self._user_id,
                current_user_timezone=self._user_timezone,
                calendar_service=calendar_service,
                notes_service=notes_service,
            )

        return reply


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def kiki_voice_entrypoint(ctx: JobContext) -> None:
    database_url = (os.getenv("DATABASE_URL") or "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL não configurada para o worker de voz.")

    room_name = str(getattr(ctx.room, "name", "") or "")
    user_id = _user_id_from_room_name(room_name) or "user"
    user_timezone = _fetch_user_timezone(database_url, user_id) if user_id != "user" else "America/Sao_Paulo"

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

    await session.start(
        room=ctx.room,
        agent=KikiVoiceAssistant(user_id=user_id, user_timezone=user_timezone, database_url=database_url),
    )
    await session.generate_reply(
        instructions="Cumprimente brevemente em português do Brasil e pergunte como pode ajudar.",
    )


def run_cli() -> None:
    agents.cli.run_app(server)

