"""Sessão de voz: token LiveKit + dispatch do agente (worker)."""

from __future__ import annotations

import os
import json
import logging
import time
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from livekit import api
from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest

from presentation.api.dependencies import CurrentUserDep, DbConnDep
from infrastructure.persistence.postgres_usage_repository import PostgresUsageRepository
from presentation.api.schemas.voice import VoiceSessionResponse

router = APIRouter(prefix="/voice", tags=["voice"])

_AGENT_NAME = os.getenv("KIKI_VOICE_AGENT_NAME", "kiki-voice").strip() or "kiki-voice"
log = logging.getLogger("kiki.voice.session")
_VOICE_BOOTSTRAP_CACHE_TTL_SECONDS = 300
_voice_bootstrap_cache: dict[str, tuple[float, dict[str, str]]] = {}


def invalidate_voice_bootstrap_cache(user_id: str) -> None:
    _voice_bootstrap_cache.pop(str(user_id), None)


def _voice_bootstrap_for_user(current_user: dict[str, Any]) -> dict[str, str]:
    user_id = str(current_user.get("id") or current_user.get("user_id") or "user")
    now = time.monotonic()
    cached = _voice_bootstrap_cache.get(user_id)
    if cached and cached[0] > now:
        return dict(cached[1])

    data = {
        "user_id": user_id,
        "display_name": str(current_user.get("name") or "Usuário"),
        "timezone": str(current_user.get("timezone") or "America/Sao_Paulo"),
        "assistant_voice": str(current_user.get("assistant_voice") or ""),
    }
    _voice_bootstrap_cache[user_id] = (now + _VOICE_BOOTSTRAP_CACHE_TTL_SECONDS, data)
    return dict(data)


async def _dispatch_voice_agent(*, lk_url: str, api_key: str, api_secret: str, room_name: str, metadata: str) -> None:
    try:
        async with api.LiveKitAPI(url=lk_url, api_key=api_key, api_secret=api_secret) as lkapi:
            await lkapi.agent_dispatch.create_dispatch(
                CreateAgentDispatchRequest(agent_name=_AGENT_NAME, room=room_name, metadata=metadata),
            )
    except Exception:
        log.exception("voice agent dispatch failed room_name=%s agent_name=%s", room_name, _AGENT_NAME)


@router.post("/session", response_model=VoiceSessionResponse)
async def create_voice_session(
    current_user: CurrentUserDep,
    conn: DbConnDep,
    background_tasks: BackgroundTasks,
) -> VoiceSessionResponse:
    """Emite JWT de participante e despacha o agente de voz para a sala."""
    lk_url = (os.getenv("LIVEKIT_URL") or "").strip()
    api_key = (os.getenv("LIVEKIT_API_KEY") or "").strip()
    api_secret = (os.getenv("LIVEKIT_API_SECRET") or "").strip()

    if not lk_url or not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit não configurado (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).",
        )

    bootstrap = _voice_bootstrap_for_user(current_user)
    uid = bootstrap["user_id"]
    display = bootstrap["display_name"]
    room_name = f"kiki-{uid}-{uuid.uuid4().hex[:12]}"
    metadata = json.dumps(bootstrap, ensure_ascii=False, separators=(",", ":"))

    try:
        grants = api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        )
        token = (
            api.AccessToken(api_key, api_secret)
            .with_identity(uid)
            .with_name(display)
            .with_metadata(metadata)
            .with_grants(grants)
            .to_jwt()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao gerar token LiveKit: {exc}",
        ) from exc

    background_tasks.add_task(
        _dispatch_voice_agent,
        lk_url=lk_url,
        api_key=api_key,
        api_secret=api_secret,
        room_name=room_name,
        metadata=metadata,
    )

    usage = PostgresUsageRepository(conn)
    usage.insert_event(str(current_user["id"]), "voice_session", {"room_name": room_name})
    conn.commit()

    return VoiceSessionResponse(url=lk_url, token=token, room_name=room_name)
