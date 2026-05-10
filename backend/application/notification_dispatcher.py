"""Loop em background que entrega lembretes Web Push baseados nas preferências do
usuário e nos eventos de calendário próximos.

Responsável por dois tipos de notificações:
  * Lembretes pontuais (reuniões / tarefas / pessoais), no lead time configurado.
  * Resumo diário (quando habilitado).

A entrega usa `PushService.deliver_once`, que é idempotente por `(user_id, dedup_key)`,
de forma que múltiplos workers / reinícios não duplicam notificações.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import psycopg
from psycopg.rows import dict_row

from application.push_service import PushService, PushNotConfiguredError
from infrastructure.config import Settings
from infrastructure.persistence.postgres_push_repository import PostgresPushRepository

log = logging.getLogger(__name__)


_LEAD_MINUTES_BY_TYPE: dict[str, list[int]] = {
    "meeting": [10],
    "task": [5],
    "personal": [10],
}

_LEAD_TOLERANCE_SECONDS = 90
_LOOKAHEAD_WINDOW = timedelta(minutes=20)
_DAILY_SUMMARY_HOUR = 8
_DAILY_SUMMARY_WINDOW_HOURS = 4
_SUMMARY_MAX_ITEMS = 3


def _build_title(event_type: str, lead: int, reminder_style: str) -> str:
    if reminder_style == "professional":
        prefix = "Lembrete"
    elif reminder_style == "motivational":
        prefix = "Vamos lá"
    else:
        prefix = "Kiki lembrete"
    if lead <= 0:
        if event_type == "meeting":
            return f"{prefix}: começa agora"
        if event_type == "task":
            return f"{prefix}: hora da tarefa"
        return f"{prefix}: começa agora"
    if event_type == "meeting":
        return f"{prefix}: reunião em {lead} min"
    if event_type == "task":
        return f"{prefix}: tarefa em {lead} min"
    return f"{prefix}: começa em {lead} min"


def _kind_for(event_type: str) -> str:
    if event_type == "meeting":
        return "meeting"
    if event_type == "task":
        return "task"
    return "reminder"


def _type_enabled(event_type: str, prefs: dict[str, Any]) -> bool:
    if event_type == "meeting":
        return bool(prefs.get("meetings_enabled"))
    if event_type == "task":
        return bool(prefs.get("tasks_enabled"))
    return bool(prefs.get("reminders_enabled"))


class NotificationDispatcher:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()

    @property
    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    def start(self) -> None:
        if not self._settings.database_url:
            log.info("notification dispatcher: DATABASE_URL ausente, ignorando")
            return
        if self._settings.push_dispatch_interval_seconds <= 0:
            log.info("notification dispatcher: PUSH_DISPATCH_INTERVAL_SECONDS=0, desligado")
            return
        if not self._settings.vapid_public_key or not self._settings.vapid_private_key:
            log.warning("notification dispatcher: VAPID keys ausentes, desligado")
            return
        if self.is_running:
            return
        self._stop_event.clear()
        loop = asyncio.get_event_loop()
        self._task = loop.create_task(self._run(), name="kiki-notification-dispatcher")

    async def stop(self) -> None:
        if not self.is_running:
            return
        self._stop_event.set()
        try:
            assert self._task is not None
            await asyncio.wait_for(self._task, timeout=5)
        except asyncio.TimeoutError:
            assert self._task is not None
            self._task.cancel()
        finally:
            self._task = None

    async def _run(self) -> None:
        interval = max(5, self._settings.push_dispatch_interval_seconds)
        log.info("notification dispatcher iniciado (interval=%ss)", interval)
        while not self._stop_event.is_set():
            try:
                await asyncio.to_thread(self._tick)
            except Exception:  # noqa: BLE001 - mantém o loop vivo
                log.exception("notification dispatcher: erro no tick")
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=interval)
            except asyncio.TimeoutError:
                pass
        log.info("notification dispatcher: parado")

    # ------------------------------------------------------------------ tick

    def _tick(self) -> None:
        with psycopg.connect(self._settings.database_url, row_factory=dict_row) as conn:
            repo = PostgresPushRepository(conn)
            service = PushService(conn, self._settings, repo)
            user_ids = repo.list_user_ids_with_subscriptions()
            for user_id in user_ids:
                try:
                    self._dispatch_for_user(conn, service, user_id)
                except PushNotConfiguredError:
                    return
                except Exception:  # noqa: BLE001
                    log.exception(
                        "notification dispatcher: falha processando user_id=%s",
                        user_id,
                    )

    # ------------------------------------------------------------------ por usuário

    def _load_prefs(self, conn: psycopg.Connection[Any], user_id: str) -> dict[str, Any] | None:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT push_enabled, sound_enabled, vibration_enabled, reminders_enabled,
                       meetings_enabled, tasks_enabled, kiki_suggestions_enabled,
                       daily_summary_enabled, weekly_report_enabled,
                       reminder_style::text AS reminder_style
                FROM notification_preferences
                WHERE user_id = %s::uuid
                """,
                (user_id,),
            )
            row = cur.fetchone()
        return dict(row) if row else None

    def _load_user_timezone(self, conn: psycopg.Connection[Any], user_id: str) -> str:
        with conn.cursor() as cur:
            cur.execute("SELECT timezone FROM users WHERE id = %s::uuid", (user_id,))
            row = cur.fetchone()
        return (row or {}).get("timezone") or "America/Sao_Paulo"

    def _load_upcoming_events(
        self,
        conn: psycopg.Connection[Any],
        user_id: str,
        now: datetime,
    ) -> list[dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text AS id, title, starts_at, event_type::text AS event_type,
                       status
                FROM calendar_events
                WHERE user_id = %s::uuid
                  AND starts_at >= %s
                  AND starts_at <= %s
                """,
                (user_id, now - timedelta(seconds=_LEAD_TOLERANCE_SECONDS), now + _LOOKAHEAD_WINDOW),
            )
            rows = cur.fetchall()
        return [dict(r) for r in rows]

    def _load_today_events(
        self,
        conn: psycopg.Connection[Any],
        user_id: str,
        now: datetime,
    ) -> list[dict[str, Any]]:
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text AS id, title, starts_at, event_type::text AS event_type
                FROM calendar_events
                WHERE user_id = %s::uuid
                  AND starts_at >= %s
                  AND starts_at <= %s
                ORDER BY starts_at ASC
                """,
                (user_id, now, end_of_day),
            )
            rows = cur.fetchall()
        return [dict(r) for r in rows]

    def _dispatch_for_user(
        self,
        conn: psycopg.Connection[Any],
        service: PushService,
        user_id: str,
    ) -> None:
        prefs = self._load_prefs(conn, user_id)
        if not prefs:
            return
        if not prefs.get("push_enabled"):
            return

        tz_name = self._load_user_timezone(conn, user_id)
        try:
            user_tz = ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            user_tz = ZoneInfo("America/Sao_Paulo")

        now_utc = datetime.now(tz=timezone.utc)

        events = self._load_upcoming_events(conn, user_id, now_utc)
        for event in events:
            event_type = event.get("event_type") or "personal"
            if (event.get("status") or "confirmed") == "completed":
                continue
            if not _type_enabled(event_type, prefs):
                continue
            starts_at: datetime = event["starts_at"]
            if starts_at.tzinfo is None:
                starts_at = starts_at.replace(tzinfo=timezone.utc)
            for lead in _LEAD_MINUTES_BY_TYPE.get(event_type, [10]):
                target = starts_at - timedelta(minutes=lead)
                diff = (now_utc - target).total_seconds()
                if diff < 0:
                    continue
                if diff > _LEAD_TOLERANCE_SECONDS:
                    continue
                dedup_key = f"event:{event['id']}:lead:{lead}"
                title = _build_title(event_type, lead, prefs.get("reminder_style") or "friendly")
                body = f"{event['title']} • {starts_at.astimezone(user_tz).strftime('%H:%M')}"
                payload = {
                    "kind": _kind_for(event_type),
                    "title": title,
                    "body": body,
                    "tag": f"kiki:{_kind_for(event_type)}:{dedup_key}",
                    "url": "/calendar",
                    "event_id": event["id"],
                }
                try:
                    service.deliver_once(user_id, _kind_for(event_type), dedup_key, payload)
                except PushNotConfiguredError:
                    raise

        if prefs.get("daily_summary_enabled"):
            tz_name = self._load_user_timezone(conn, user_id)
            try:
                tz = ZoneInfo(tz_name)
            except ZoneInfoNotFoundError:
                tz = ZoneInfo("America/Sao_Paulo")
            now_local = now_utc.astimezone(tz)
            if (
                _DAILY_SUMMARY_HOUR
                <= now_local.hour
                < _DAILY_SUMMARY_HOUR + _DAILY_SUMMARY_WINDOW_HOURS
            ):
                today_key = now_local.strftime("%Y-%m-%d")
                dedup_key = f"daily:{today_key}"
                if not service._repo.was_delivered(user_id, dedup_key):  # noqa: SLF001
                    today_events = self._load_today_events(conn, user_id, now_utc)
                    upcoming = [e for e in today_events if e["starts_at"] >= now_utc]
                    if upcoming:
                        sample = " • ".join(
                            f"{e['starts_at'].astimezone(tz).strftime('%H:%M')} {e['title']}"
                            for e in upcoming[:_SUMMARY_MAX_ITEMS]
                        )
                        extra = (
                            f" • +{len(upcoming) - _SUMMARY_MAX_ITEMS}"
                            if len(upcoming) > _SUMMARY_MAX_ITEMS
                            else ""
                        )
                        title = (
                            f"Bom dia! {len(upcoming)} {'item' if len(upcoming) == 1 else 'itens'} hoje"
                        )
                        body = sample + extra
                    else:
                        title = "Bom dia! Sem compromissos hoje"
                        body = "Aproveite o dia :)"
                    payload = {
                        "kind": "daily_summary",
                        "title": title,
                        "body": body,
                        "tag": f"kiki:daily_summary:{today_key}",
                        "url": "/home",
                    }
                    service.deliver_once(user_id, "daily_summary", dedup_key, payload)
