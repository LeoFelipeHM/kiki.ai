from __future__ import annotations

import os
import re
import json
import logging
from typing import Any

from dotenv import load_dotenv

import psycopg
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, TurnHandlingOptions, llm, room_io
from livekit.plugins import silero
from psycopg.rows import dict_row

from application.azure_voice_ids import AZURE_PT_BR_VOICE_IDS_FROZEN
from application.calendar_service import CalendarService
from application.contacts_service import ContactsService
from application.notes_service import NotesService
from infrastructure.persistence.postgres_calendar_repository import PostgresCalendarRepository
from infrastructure.persistence.postgres_contacts_repository import PostgresContactsRepository
from infrastructure.persistence.postgres_notes_repository import PostgresNotesRepository
from llm.openai_chat_client import generate_reply_with_tools
from .llm import build_llm
from .stt import build_stt
from .tts import build_tts

load_dotenv()

AGENT_NAME = os.getenv("KIKI_VOICE_AGENT_NAME", "kiki-voice").strip() or "kiki-voice"
CAMERA_FRAME_TOPIC = "kiki.camera.frame"
MAX_CAMERA_FRAME_DATA_URL_CHARS = 20_000
log = logging.getLogger("kiki.livekit")

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


def _fetch_user_assistant_voice(database_url: str, user_id: str) -> str | None:
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT assistant_voice FROM users WHERE id = %s::uuid", (user_id,))
            row = cur.fetchone()
    if not isinstance(row, dict):
        return None
    v = row.get("assistant_voice")
    return str(v).strip() if v else None


class _VoiceSessionNotesService:
    def __init__(self, inner: NotesService, assistant: "KikiVoiceAssistant") -> None:
        self._inner = inner
        self._assistant = assistant

    def list_notes(self, *args: Any, **kwargs: Any) -> Any:
        return self._inner.list_notes(*args, **kwargs)

    def create_note(self, *args: Any, **kwargs: Any) -> Any:
        row = self._inner.create_note(*args, **kwargs)
        self._assistant.remember_active_note(row)
        return row

    def get_note(self, *args: Any, **kwargs: Any) -> Any:
        return self._inner.get_note(*args, **kwargs)

    def update_note(self, *args: Any, **kwargs: Any) -> Any:
        row = self._inner.update_note(*args, **kwargs)
        if row:
            self._assistant.remember_active_note(row)
        return row

    def delete_note(self, user_id: str, note_id: str) -> bool:
        ok = self._inner.delete_note(user_id, note_id)
        if ok:
            self._assistant.forget_active_note(note_id)
        return ok


class KikiVoiceAssistant(Agent):
    def __init__(self, *, user_id: str, user_timezone: str, database_url: str) -> None:
        self._user_id = user_id
        self._user_timezone = user_timezone
        self._database_url = database_url
        self._active_note: dict[str, Any] | None = None
        self._latest_camera_frame: dict[str, str] | None = None
        super().__init__(
            instructions="""Você é a Kiki, assistente pessoal por voz no Brasil.
Responda em português do Brasil, em frases curtas e naturais para conversa falada.
Não use markdown, listas numeradas, emojis ou símbolos estranhos.
Seja cordial, objetiva e útil.

Você tem acesso ao calendário, às notas e aos contatos do usuário autenticado do app Kiki por meio de ferramentas internas.
Não invente compromissos, horários, contatos nem e-mails; consulte quando precisar.

Para fatos públicos ou atualizados (notícias, clima, preços), você pode usar busca na web; para agenda, notas e contatos do usuário, use sempre as ferramentas internas.
Quando a resposta vier da web, fale só o conteúdo verificado em palavras — nunca leia links, URLs ou nomes de sites em voz alta.

Notas (importante):
- Você pode criar, editar e excluir notas quando o usuário pedir.
- Se faltar informação (ex.: título, conteúdo, qual nota alterar), faça uma pergunta curta para completar antes de executar.

Contatos (importante):
- Você pode criar, editar e excluir contatos quando o usuário pedir.
- Contato exige nome e e-mail. Se o usuário não der o e-mail, pergunte antes de criar.
- Soletre e-mails com calma quando precisar confirmar com o usuário, mas nunca leia "arroba", "ponto" como símbolos: prefira ditar de forma natural, por exemplo "joana ponto silva arroba gmail ponto com".
- Antes de excluir, confirme com o usuário.

Formatação para fala (muito importante):
- Nunca leia datas/horas em formato técnico com barras ou hífens (ex.: "09/09/12", "2026-05-09", "09:30").
- Converta para formato falado: "9 de setembro de 2012", "9 de maio de 2026", "nove e meia", "nove horas e trinta".
- Prefira números simples e naturais na fala. Se necessário, diga por extenso (ex.: "dezesseis" em vez de "16").
- Ao citar intervalos, fale "das X às Y" e inclua o dia quando necessário.""",
        )

    def remember_active_note(self, row: dict[str, Any]) -> None:
        note_id = str(row.get("id") or "").strip()
        if not note_id:
            return
        self._active_note = {
            "id": note_id,
            "title": str(row.get("title") or "").strip(),
            "content": str(row.get("content") or "").strip(),
            "tags": list(row.get("tags") or []),
        }

    def forget_active_note(self, note_id: str) -> None:
        active_id = str((self._active_note or {}).get("id") or "")
        if active_id and active_id == str(note_id):
            self._active_note = None

    def voice_session_context(self) -> str | None:
        parts: list[str] = []

        if self._active_note:
            title = self._active_note.get("title") or "(sem título)"
            content = str(self._active_note.get("content") or "")
            if len(content) > 2000:
                content = content[:2000].rstrip() + "... [conteúdo truncado]"
            tags = ", ".join(str(t) for t in self._active_note.get("tags") or [])

            parts.append(
                "Nota ativa nesta sessão de voz:\n"
                f"- note_id: {self._active_note['id']}\n"
                f"- título: {title}\n"
                f"- conteúdo atual: {content or '(vazio)'}\n"
                f"- tags: {tags or '(nenhuma)'}\n\n"
                "Se o usuário pedir para alterar, corrigir, completar, acrescentar ou remover algo de "
                "\"essa nota\", \"ela\", \"a nota\" ou da nota recém-criada sem identificar outra nota, "
                "use notes_update_note com esse note_id. Não use notes_create_note para alterações da nota ativa. "
                "Só crie uma nova nota quando o usuário pedir explicitamente uma nova nota."
            )

        if self._latest_camera_frame:
            parts.append(
                "A mensagem mais recente do usuário pode ter uma imagem da câmera anexada. "
                "Use essa imagem como contexto visual atual quando o pedido do usuário depender do que ele está mostrando."
            )

        return "\n\n".join(parts) if parts else None

    def remember_camera_frame(self, data_packet: Any) -> None:
        if getattr(data_packet, "topic", None) != CAMERA_FRAME_TOPIC:
            return
        try:
            payload = json.loads(data_packet.data.decode("utf-8"))
        except Exception:
            log.debug("camera frame ignored: invalid json")
            return

        if not isinstance(payload, dict) or payload.get("type") != "camera_frame":
            return

        image = str(payload.get("image") or "").strip()
        if not image.startswith("data:image/jpeg;base64,"):
            return
        if len(image) > MAX_CAMERA_FRAME_DATA_URL_CHARS:
            log.debug("camera frame ignored: payload too large")
            return

        self._latest_camera_frame = {
            "image": image,
            "captured_at": str(payload.get("capturedAt") or ""),
            "facing_mode": str(payload.get("facingMode") or ""),
        }

    def latest_camera_image_data_url(self) -> str | None:
        if not self._latest_camera_frame:
            return None
        return self._latest_camera_frame.get("image")

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
            notes_service = _VoiceSessionNotesService(
                NotesService(conn, PostgresNotesRepository(conn)),
                self,
            )
            contacts_service = ContactsService(conn, PostgresContactsRepository(conn))
            reply = generate_reply_with_tools(
                pairs,
                current_user_id=self._user_id,
                current_user_timezone=self._user_timezone,
                calendar_service=calendar_service,
                notes_service=notes_service,
                contacts_service=contacts_service,
                additional_system_context=self.voice_session_context(),
                latest_input_image_data_url=self.latest_camera_image_data_url(),
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
    voice_pref = (
        _fetch_user_assistant_voice(database_url, user_id)
        if user_id != "user"
        else None
    )
    voice_override = voice_pref if voice_pref and voice_pref in AZURE_PT_BR_VOICE_IDS_FROZEN else None

    session = AgentSession(
        stt=build_stt(),
        llm=build_llm(),
        tts=build_tts(voice_override=voice_override),
        vad=silero.VAD.load(activation_threshold=0.3),
        turn_handling=TurnHandlingOptions(
            turn_detection="stt",
            endpointing={"min_delay": 0},
        ),
    )

    assistant = KikiVoiceAssistant(user_id=user_id, user_timezone=user_timezone, database_url=database_url)

    @ctx.room.on("data_received")
    def _on_data_received(data_packet: Any) -> None:
        assistant.remember_camera_frame(data_packet)

    await session.start(
        room=ctx.room,
        agent=assistant,
        # Texto no cliente assim que o modelo/TTS geram (menos espera alinhando áudio).
        room_options=room_io.RoomOptions(
            text_output=room_io.TextOutputOptions(sync_transcription=False),
        ),
    )
    await session.generate_reply(
        instructions="Cumprimente brevemente em português do Brasil e pergunte como pode ajudar.",
    )


def run_cli() -> None:
    agents.cli.run_app(server)
