from __future__ import annotations

import logging
from datetime import datetime, time, timedelta
from typing import Any, cast

from zoneinfo import ZoneInfo

from domain.calendar import RecurrenceValidationError, ScheduleConflictError

from llm.tools.schemas import ToolName

log = logging.getLogger("kiki.llm.tools")


def _tool_error(message: str) -> dict[str, Any]:
    return {"ok": False, "error": message}


def _tool_ok(payload: Any) -> dict[str, Any]:
    return {"ok": True, "data": payload}


def _parse_iso_dt(value: str, user_timezone: str | None) -> datetime:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Data/hora inválida (use ISO 8601).") from exc
    if dt.tzinfo is None:
        tz = ZoneInfo(user_timezone) if user_timezone else datetime.now().astimezone().tzinfo
        dt = dt.replace(tzinfo=tz)
    return dt


def _current_week_range_local(now: datetime | None = None) -> tuple[datetime, datetime]:
    cur = (now or datetime.now().astimezone()).astimezone()
    monday = (cur - timedelta(days=cur.weekday())).date()
    start = datetime.combine(monday, time.min, tzinfo=cur.tzinfo)
    end = start + timedelta(days=7)
    return start, end


def _format_dt_for_user(dt: datetime, user_timezone: str | None) -> str:
    try:
        tz = ZoneInfo(user_timezone) if user_timezone else None
    except Exception:
        tz = None
    local = dt.astimezone(tz) if tz else dt.astimezone()
    return local.strftime("%d/%m %H:%M")


def _find_conflicts(
    *,
    calendar_service: Any,
    user_id: str,
    starts_at: datetime,
    ends_at: datetime,
    exclude_event_id: str | None = None,
) -> list[dict[str, Any]]:
    return calendar_service.find_conflicts(
        user_id,
        starts_at,
        ends_at,
        exclude_event_id=exclude_event_id,
    )


def execute_tool_call(
    name: ToolName,
    arguments: dict[str, Any],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    calendar_service: Any,
    notes_service: Any,
) -> dict[str, Any]:
    """Executa uma tool e retorna um payload JSON serializável para devolver ao modelo."""
    try:
        log.info("tool_call name=%s user_id=%s args_keys=%s", name, current_user_id, sorted(arguments.keys()))

        if name == "calendar_list_events":
            from_iso = cast(str | None, arguments.get("from_iso"))
            to_iso = cast(str | None, arguments.get("to_iso"))
            if not from_iso and not to_iso:
                rf, rt = _current_week_range_local()
            else:
                rf = _parse_iso_dt(from_iso, current_user_timezone) if from_iso else None
                rt = _parse_iso_dt(to_iso, current_user_timezone) if to_iso else None
            rows = calendar_service.list_events(current_user_id, rf, rt)
            return _tool_ok(rows)

        if name == "calendar_create_event":
            title = str(arguments.get("title") or "").strip()
            if not title:
                return _tool_error("Título do evento é obrigatório.")
            starts_at = _parse_iso_dt(str(arguments.get("starts_at")), current_user_timezone)
            ends_at = _parse_iso_dt(str(arguments.get("ends_at")), current_user_timezone)

            event_type = str(arguments.get("event_type"))
            color = cast(str | None, arguments.get("color"))
            description = cast(str | None, arguments.get("description"))
            status = str(arguments.get("status") or "confirmed")
            guests_in = cast(list[dict[str, Any]] | None, arguments.get("guests")) or []
            guests: list[tuple[str, str | None]] = []
            for g in guests_in:
                nm = str(g.get("name") or "").strip()
                if not nm:
                    continue
                em = cast(str | None, g.get("email"))
                guests.append((nm, (em.strip() if isinstance(em, str) and em.strip() else None)))

            raw_rec = arguments.get("recurrence")
            recurrence: dict[str, Any] | None = raw_rec if isinstance(raw_rec, dict) else None

            def _conflict_block(conflicts: list[dict[str, Any]], *, slot: datetime | None = None) -> dict[str, Any]:
                preview = []
                for c in conflicts[:3]:
                    cs = c.get("starts_at")
                    ce = c.get("ends_at")
                    if isinstance(cs, datetime) and isinstance(ce, datetime):
                        when = f"{_format_dt_for_user(cs, current_user_timezone)}–{_format_dt_for_user(ce, current_user_timezone)}"
                    else:
                        when = "horário indefinido"
                    preview.append(f"- {c.get('title','(sem título)')} ({when})")
                more = f"\n(+{len(conflicts) - 3} outros)" if len(conflicts) > 3 else ""
                head = "Conflito de horário na série recorrente" if slot else "Conflito de horário"
                slot_note = ""
                if slot is not None and isinstance(slot, datetime):
                    slot_note = f" na ocorrência de {_format_dt_for_user(slot, current_user_timezone)}"
                return _tool_error(
                    f"{head}{slot_note}: já existe(m) compromisso(s) nesse intervalo.\n"
                    + "\n".join(preview)
                    + more
                    + "\nQuer que eu marque mesmo assim ou prefira outro horário?"
                )

            if recurrence:
                freq = str(recurrence.get("frequency") or "").strip()
                if freq not in ("daily", "weekly", "monthly", "yearly"):
                    return _tool_error("recurrence.frequency deve ser daily, weekly, monthly ou yearly.")
                interval_raw = recurrence.get("interval")
                try:
                    interval = int(interval_raw) if interval_raw is not None else 1
                except (TypeError, ValueError):
                    return _tool_error("recurrence.interval deve ser um inteiro >= 1.")
                count_val = recurrence.get("count")
                count: int | None
                try:
                    count = int(count_val) if count_val is not None else None
                except (TypeError, ValueError):
                    return _tool_error("recurrence.count deve ser um inteiro quando informado.")
                until_iso = recurrence.get("until_iso")
                until_dt: datetime | None = None
                if until_iso:
                    until_dt = _parse_iso_dt(str(until_iso), current_user_timezone)
                try:
                    payload = calendar_service.create_recurring_series(
                        current_user_id,
                        title=title,
                        starts_at=starts_at,
                        ends_at=ends_at,
                        event_type=event_type,
                        color=(color.strip() if isinstance(color, str) and color.strip() else None),
                        description=(description.strip() if isinstance(description, str) and description.strip() else None),
                        status=status,
                        guests=guests,
                        frequency=freq,  # type: ignore[arg-type]
                        interval=interval,
                        count=count,
                        until=until_dt,
                    )
                    return _tool_ok(payload)
                except RecurrenceValidationError as exc:
                    return _tool_error(str(exc))
                except ScheduleConflictError as exc:
                    slot = exc.slot_start if isinstance(exc.slot_start, datetime) else None
                    return _conflict_block(list(exc.conflicts), slot=slot)

            conflicts = _find_conflicts(
                calendar_service=calendar_service,
                user_id=current_user_id,
                starts_at=starts_at,
                ends_at=ends_at,
            )
            if conflicts:
                return _conflict_block(conflicts)

            row = calendar_service.create_event(
                current_user_id,
                title=title,
                starts_at=starts_at,
                ends_at=ends_at,
                event_type=event_type,
                color=(color.strip() if isinstance(color, str) and color.strip() else None),
                description=(description.strip() if isinstance(description, str) and description.strip() else None),
                status=status,
                guests=guests,
            )
            return _tool_ok(row)

        if name == "calendar_update_event":
            event_id = str(arguments.get("event_id") or "").strip()
            if not event_id:
                return _tool_error("event_id é obrigatório.")
            patch: dict[str, Any] = {}
            if "title" in arguments and arguments.get("title") is not None:
                patch["title"] = str(arguments.get("title")).strip()
            if "starts_at" in arguments and arguments.get("starts_at") is not None:
                patch["starts_at"] = _parse_iso_dt(str(arguments.get("starts_at")), current_user_timezone)
            if "ends_at" in arguments and arguments.get("ends_at") is not None:
                patch["ends_at"] = _parse_iso_dt(str(arguments.get("ends_at")), current_user_timezone)
            if "event_type" in arguments and arguments.get("event_type") is not None:
                patch["event_type"] = str(arguments.get("event_type"))
            if "color" in arguments and arguments.get("color") is not None:
                patch["color"] = cast(str, arguments.get("color"))
            if "description" in arguments and arguments.get("description") is not None:
                patch["description"] = cast(str, arguments.get("description"))
            if "status" in arguments and arguments.get("status") is not None:
                patch["status"] = cast(str, arguments.get("status"))

            guests_replace = "guests" in arguments
            guests_in = cast(list[dict[str, Any]] | None, arguments.get("guests")) if guests_replace else None
            guests: list[tuple[str, str | None]] | None = None
            if guests_replace:
                guests = []
                for g in guests_in or []:
                    nm = str(g.get("name") or "").strip()
                    if not nm:
                        continue
                    em = cast(str | None, g.get("email"))
                    guests.append((nm, (em.strip() if isinstance(em, str) and em.strip() else None)))

            # Se mexeu no intervalo, valide conflitos antes de persistir.
            if "starts_at" in patch or "ends_at" in patch:
                current = calendar_service.get_event(current_user_id, event_id)
                if not current:
                    return _tool_error("Evento não encontrado.")
                effective_start = cast(datetime, patch.get("starts_at") or current.get("starts_at"))
                effective_end = cast(datetime, patch.get("ends_at") or current.get("ends_at"))
                conflicts = _find_conflicts(
                    calendar_service=calendar_service,
                    user_id=current_user_id,
                    starts_at=effective_start,
                    ends_at=effective_end,
                    exclude_event_id=event_id,
                )
                if conflicts:
                    preview = []
                    for c in conflicts[:3]:
                        cs = c.get("starts_at")
                        ce = c.get("ends_at")
                        if isinstance(cs, datetime) and isinstance(ce, datetime):
                            when = f"{_format_dt_for_user(cs, current_user_timezone)}–{_format_dt_for_user(ce, current_user_timezone)}"
                        else:
                            when = "horário indefinido"
                        preview.append(f"- {c.get('title','(sem título)')} ({when})")
                    more = f"\n(+{len(conflicts) - 3} outros)" if len(conflicts) > 3 else ""
                    return _tool_error(
                        "Conflito de horário: já existe(m) compromisso(s) nesse intervalo.\n"
                        + "\n".join(preview)
                        + more
                        + "\nQuer que eu altere mesmo assim ou prefira outro horário?"
                    )

            row = calendar_service.update_event(
                current_user_id,
                event_id,
                title=patch.get("title"),
                starts_at=patch.get("starts_at"),
                ends_at=patch.get("ends_at"),
                event_type=patch.get("event_type"),
                color=patch.get("color"),
                description=patch.get("description"),
                status=patch.get("status"),
                guests_replace=guests_replace,
                guests=guests,
            )
            if not row:
                return _tool_error("Evento não encontrado.")
            return _tool_ok(row)

        if name == "calendar_delete_event":
            event_id = str(arguments.get("event_id") or "").strip()
            if not event_id:
                return _tool_error("event_id é obrigatório.")
            ok = calendar_service.delete_event(current_user_id, event_id)
            if not ok:
                return _tool_error("Evento não encontrado.")
            return _tool_ok({"deleted": True})

        if name == "notes_list_notes":
            q = cast(str | None, arguments.get("q"))
            rows = notes_service.list_notes(current_user_id, q)
            return _tool_ok(rows)

        if name == "notes_create_note":
            title = str(arguments.get("title") or "")
            content = str(arguments.get("content") or "")
            is_pinned = bool(arguments.get("is_pinned") or False)
            is_locked = bool(arguments.get("is_locked") or False)
            tags = cast(list[str] | None, arguments.get("tags")) or []
            row = notes_service.create_note(
                current_user_id,
                title=title,
                content=content,
                is_pinned=is_pinned,
                is_locked=is_locked,
                tags=tags,
            )
            return _tool_ok(row)

        if name == "notes_update_note":
            note_id = str(arguments.get("note_id") or "").strip()
            if not note_id:
                return _tool_error("note_id é obrigatório.")
            data: dict[str, Any] = {}
            if "title" in arguments and arguments.get("title") is not None:
                data["title"] = cast(str, arguments.get("title"))
            if "content" in arguments and arguments.get("content") is not None:
                data["content"] = cast(str, arguments.get("content"))
            if "is_pinned" in arguments and arguments.get("is_pinned") is not None:
                data["is_pinned"] = bool(arguments.get("is_pinned"))
            if "is_locked" in arguments and arguments.get("is_locked") is not None:
                data["is_locked"] = bool(arguments.get("is_locked"))

            tags_replace = "tags" in arguments
            tags_val = cast(list[str] | None, arguments.get("tags")) if tags_replace else None

            row = notes_service.update_note(
                current_user_id,
                note_id,
                title=data.get("title"),
                content=data.get("content"),
                is_pinned=data.get("is_pinned"),
                is_locked=data.get("is_locked"),
                tags_replace=tags_replace,
                tags=tags_val,
            )
            if not row:
                return _tool_error("Nota não encontrada.")
            return _tool_ok(row)

        if name == "notes_delete_note":
            note_id = str(arguments.get("note_id") or "").strip()
            if not note_id:
                return _tool_error("note_id é obrigatório.")
            ok = notes_service.delete_note(current_user_id, note_id)
            if not ok:
                return _tool_error("Nota não encontrada.")
            return _tool_ok({"deleted": True})

        return _tool_error("Ferramenta desconhecida.")
    except Exception as exc:
        log.exception("tool_failed name=%s user_id=%s", name, current_user_id)
        msg = str(exc) or exc.__class__.__name__
        low = msg.lower()
        if "connection is closed" in low or ("closed" in low and "connection" in low):
            return _tool_error("Não consegui salvar agora porque a conexão com o banco está fechada (serviço offline).")
        if "could not connect" in low or "connection refused" in low:
            return _tool_error("Não consegui salvar agora porque não consegui conectar ao banco (serviço offline).")
        return _tool_error(msg)

