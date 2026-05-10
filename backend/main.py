import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from application.notification_dispatcher import NotificationDispatcher
from infrastructure.config import load_settings
from presentation.api.routers import (
    admin,
    admin_usage,
    auth,
    calendar,
    chat,
    health,
    notes,
    push,
    settings,
    voice_livekit,
)


def _cors_allow_origins() -> list[str]:
    """Origens permitidas (browser envia Origin no preflight OPTIONS)."""

    defaults = [
        # Local
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",

        # Servidor Azure
        "http://20.15.165.251:5173",
        "http://20.15.165.251:8000",

        # Servidor Caddy
        "https://api.heykiki.com.br",
        "https://www.heykiki.com.br",
    ]

    extra = os.getenv("CORS_ORIGINS", "").strip()

    merged = defaults + [
        o.strip()
        for o in extra.split(",")
        if o.strip()
    ]

    seen: set[str] = set()
    out: list[str] = []

    for o in merged:
        normalized = o.rstrip("/")

        if normalized not in seen:
            seen.add(normalized)
            out.append(normalized)

    return out


def _cors_origin_regex() -> str | None:
    """
    Opcional:
    Permite qualquer porta no IP da VM.
    """

    raw = os.getenv("CORS_ORIGIN_REGEX", "").strip()

    if raw:
        return raw

    return r"^http://20\.15\.165\.251(:\d+)?$"


_app_settings = load_settings()
_notification_dispatcher = NotificationDispatcher(_app_settings)


@asynccontextmanager
async def _lifespan(_: FastAPI):
    _notification_dispatcher.start()
    try:
        yield
    finally:
        await _notification_dispatcher.stop()


app = FastAPI(title="kiki-backend", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_origin_regex=_cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(admin_usage.router)
app.include_router(calendar.router)
app.include_router(notes.router)
app.include_router(settings.router)
app.include_router(chat.router)
app.include_router(voice_livekit.router)
app.include_router(push.router)