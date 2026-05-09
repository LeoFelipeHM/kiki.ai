from __future__ import annotations

from pydantic import BaseModel


class VoiceSessionResponse(BaseModel):
    """Credenciais para o cliente WebRTC entrar na sala com o agente."""

    url: str
    token: str
    room_name: str
