from typing import Any

import psycopg

from application.bootstrap_defaults import bootstrap_user_defaults
from infrastructure.persistence.postgres_settings_repository import PostgresSettingsRepository

_THEME_MODES = frozenset({"light", "dark"})
_VOICES = frozenset({"feminine", "masculine", "neutral"})
_REMINDER_STYLES = frozenset({"friendly", "professional", "motivational"})
_PROVIDERS = frozenset({"google_calendar", "gmail", "outlook", "apple_watch"})
_INTEGRATION_PATCH_STATUSES = frozenset({"connected", "disconnected"})


class SettingsService:
    def __init__(self, conn: psycopg.Connection[Any], repo: PostgresSettingsRepository) -> None:
        self._conn = conn
        self._repo = repo

    def get_settings(self, user_id: str) -> dict[str, Any]:
        bootstrap_user_defaults(self._conn, user_id)
        self._conn.commit()
        ui = self._repo.get_ui_prefs(user_id)
        notif = self._repo.get_notification_prefs(user_id)
        if not notif:
            raise RuntimeError("Preferências de notificação ausentes após bootstrap.")
        notif_out = {**notif, "reminder_style": str(notif["reminder_style"])}
        integrations = self._repo.list_integrations(user_id)
        return {"ui": ui, "notifications": notif_out, "integrations": integrations}

    def patch_ui(self, user_id: str, *, theme_mode: str | None, assistant_voice: str | None) -> dict[str, Any]:
        if theme_mode is not None and theme_mode not in _THEME_MODES:
            raise ValueError("theme_mode inválido.")
        if assistant_voice is not None and assistant_voice not in _VOICES:
            raise ValueError("assistant_voice inválido.")
        if theme_mode is None and assistant_voice is None:
            raise ValueError("Nenhum campo para atualizar.")
        row = self._repo.patch_ui_prefs(user_id, theme_mode, assistant_voice)
        self._conn.commit()
        return row

    def patch_notifications(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not payload:
            raise ValueError("Nenhum campo para atualizar.")
        if "reminder_style" in payload:
            rs = payload["reminder_style"]
            if rs not in _REMINDER_STYLES:
                raise ValueError("reminder_style inválido.")
        row = self._repo.patch_notification_prefs(user_id, payload)
        self._conn.commit()
        return row

    def patch_integration(self, user_id: str, provider: str, status: str) -> dict[str, Any]:
        if provider not in _PROVIDERS:
            raise ValueError("provider inválido.")
        if status not in _INTEGRATION_PATCH_STATUSES:
            raise ValueError("status inválido.")
        bootstrap_user_defaults(self._conn, user_id)
        row = self._repo.patch_integration_status(user_id, provider, status)
        if row is None:
            raise LookupError("Integração não encontrada.")
        self._conn.commit()
        return row
