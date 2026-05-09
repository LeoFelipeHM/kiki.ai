"""Sessão de voz: token LiveKit + dispatch do agente (worker)."""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, HTTPException, status
from livekit import api
from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest

from presentation.api.dependencies import CurrentUserDep
from presentation.api.schemas.voice import VoiceSessionResponse

router = APIRouter(prefix="/voice", tags=["voice"])

_AGENT_NAME = os.getenv("KIKI_VOICE_AGENT_NAME", "kiki-voice").strip() or "kiki-voice"


@router.post("/session", response_model=VoiceSessionResponse)
async def create_voice_session(current_user: CurrentUserDep) -> VoiceSessionResponse:
    """Emite JWT de participante e despacha o agente de voz para a sala."""
    lk_url = (os.getenv("LIVEKIT_URL") or "").strip()
    api_key = (os.getenv("LIVEKIT_API_KEY") or "").strip()
    api_secret = (os.getenv("LIVEKIT_API_SECRET") or "").strip()

    if not lk_url or not api_key or not api_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit não configurado (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).",
        )

    uid = str(current_user.get("id") or current_user.get("user_id") or "user")
    display = str(current_user.get("name") or "Usuário")
    room_name = f"kiki-{uid}-{uuid.uuid4().hex[:12]}"

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
            .with_grants(grants)
            .to_jwt()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao gerar token LiveKit: {exc}",
        ) from exc

    try:
        async with api.LiveKitAPI(url=lk_url, api_key=api_key, api_secret=api_secret) as lkapi:
            await lkapi.agent_dispatch.create_dispatch(
                CreateAgentDispatchRequest(agent_name=_AGENT_NAME, room=room_name),
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao despachar agente de voz: {exc}",
        ) from exc

    return VoiceSessionResponse(url=lk_url, token=token, room_name=room_name)
