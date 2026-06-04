from __future__ import annotations

import logging
from datetime import datetime, time, timedelta
from typing import Any, cast

from zoneinfo import ZoneInfo

from application.contacts_service import DuplicateContactEmailError
from domain.calendar import RecurrenceValidationError, ScheduleConflictError

from llm.tools.schemas import ToolName
from llm.tools.web_browse import browse_public_page

log = logging.getLogger("kiki.llm.tools")
DEFAULT_USER_TIMEZONE = "America/Sao_Paulo"


def _tool_error(message: str) -> dict[str, Any]:
    return {"ok": False, "error": message}


def _tool_ok(payload: Any) -> dict[str, Any]:
    return {"ok": True, "data": payload}


def _agent_public(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": row.get("name"),
        "task": row.get("task"),
        "status": row.get("status"),
        "type": row.get("type"),
        "effort": row.get("effort"),
        "progress": row.get("progress"),
        "current_action": row.get("current_action"),
        "results": row.get("results"),
        "error_message": row.get("error_message"),
        "steps": [
            {
                "position": step.get("position"),
                "description": step.get("description"),
                "status": step.get("status"),
                "details": step.get("details"),
            }
            for step in row.get("steps", [])
        ],
    }


def _normalize_agent_name(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _find_agent_id_by_name(rows: list[dict[str, Any]], name: str) -> str | None:
    needle = _normalize_agent_name(name)
    if not needle:
        return None
    exact = [row for row in rows if _normalize_agent_name(str(row.get("name") or "")) == needle]
    if len(exact) == 1:
        return str(exact[0]["id"])
    contains = [
        row
        for row in rows
        if needle in _normalize_agent_name(str(row.get("name") or ""))
        or _normalize_agent_name(str(row.get("name") or "")) in needle
    ]
    if len(contains) == 1:
        return str(contains[0]["id"])
    return None


def _editable_agent_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [row for row in rows if str(row.get("status") or "") in ("planned", "paused", "error")]


def _resolve_editable_agent_id(rows: list[dict[str, Any]], name: str, agent_id: str) -> tuple[str | None, str | None]:
    if name:
        resolved = _find_agent_id_by_name(rows, name)
        if resolved:
            return resolved, None
        available = ", ".join(str(row.get("name") or "") for row in _editable_agent_rows(rows)[:5])
        suffix = f" Agentes editáveis: {available}." if available else ""
        return None, f"Não encontrei um agente editável com esse nome.{suffix}"
    if agent_id:
        match = next((row for row in rows if str(row.get("id")) == agent_id), None)
        if match and str(match.get("status") or "") in ("planned", "paused", "error"):
            return agent_id, None
        return None, "Esse agente não está editável agora."
    editable = _editable_agent_rows(rows)
    if len(editable) == 1:
        return str(editable[0]["id"]), None
    if not editable:
        return None, "Não há agente editável para receber essa instrução."
    available = ", ".join(str(row.get("name") or "") for row in editable[:5])
    return None, f"Qual agente devo corrigir? Agentes editáveis: {available}."


def _parse_iso_dt(value: str, user_timezone: str | None) -> datetime:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Data/hora inválida (use ISO 8601).") from exc
    if dt.tzinfo is None:
        tz = ZoneInfo(user_timezone or DEFAULT_USER_TIMEZONE)
        dt = dt.replace(tzinfo=tz)
    return dt


def _current_week_range_local(now: datetime | None = None) -> tuple[datetime, datetime]:
    tz = ZoneInfo(DEFAULT_USER_TIMEZONE)
    cur = (now or datetime.now(tz)).astimezone(tz)
    monday = (cur - timedelta(days=cur.weekday())).date()
    start = datetime.combine(monday, time.min, tzinfo=cur.tzinfo)
    end = start + timedelta(days=7)
    return start, end


def _format_dt_for_user(dt: datetime, user_timezone: str | None) -> str:
    try:
        tz = ZoneInfo(user_timezone or DEFAULT_USER_TIMEZONE)
    except Exception:
        tz = ZoneInfo(DEFAULT_USER_TIMEZONE)
    local = dt.astimezone(tz)
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


def _normalize_lookup(value: str) -> str:
    return " ".join(value.strip().lower().lstrip("@").split())


def _resolve_friend_user_id(friends_service: Any, current_user_id: str, friend_user_id: str, friend_name: str) -> tuple[str | None, str | None]:
    if friend_user_id:
        return friend_user_id, None
    if friends_service is None:
        return None, "Serviço de amigos indisponível nesta sessão."
    needle = _normalize_lookup(friend_name)
    if not needle:
        return None, "Informe qual amigo devo usar."
    rows = friends_service.list_friends(current_user_id)
    matches = []
    for row in rows:
        candidates = [
            str(row.get("friend_name") or ""),
            str(row.get("friend_nickname") or ""),
            str(row.get("friend_email") or ""),
        ]
        normalized = [_normalize_lookup(c) for c in candidates]
        if any(needle == c or needle in c or c in needle for c in normalized if c):
            matches.append(row)
    if len(matches) == 1:
        return str(matches[0]["friend_user_id"]), None
    if not matches:
        available = ", ".join(str(row.get("friend_name") or row.get("friend_nickname") or "") for row in rows[:5])
        suffix = f" Amigos disponíveis: {available}." if available else ""
        return None, f"Não encontrei esse amigo.{suffix}"
    available = ", ".join(str(row.get("friend_name") or row.get("friend_nickname") or "") for row in matches[:5])
    return None, f"Encontrei mais de um amigo possível: {available}. Qual deles?"


def _resolve_note_id(notes_service: Any, current_user_id: str, note_id: str, note_title: str) -> tuple[str | None, str | None]:
    if note_id:
        return note_id, None
    needle = _normalize_lookup(note_title)
    if not needle:
        return None, "Informe qual nota devo compartilhar."
    rows = notes_service.list_notes(current_user_id, note_title)
    matches = []
    for row in rows:
        title = _normalize_lookup(str(row.get("title") or ""))
        if needle == title or needle in title or title in needle:
            matches.append(row)
    if len(matches) == 1:
        return str(matches[0]["id"]), None
    if not matches:
        available = ", ".join(str(row.get("title") or "(sem título)") for row in rows[:5])
        suffix = f" Notas encontradas na busca: {available}." if available else ""
        return None, f"Não encontrei essa nota.{suffix}"
    available = ", ".join(str(row.get("title") or "(sem título)") for row in matches[:5])
    return None, f"Encontrei mais de uma nota possível: {available}. Qual delas?"


def execute_tool_call(
    name: ToolName,
    arguments: dict[str, Any],
    *,
    current_user_id: str,
    current_user_timezone: str | None,
    current_user_name: str | None = None,
    calendar_service: Any,
    notes_service: Any,
    contacts_service: Any = None,
    agents_service: Any = None,
    friends_service: Any = None,
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

        if name == "friends_list_friends":
            if friends_service is None:
                return _tool_error("Serviço de amigos indisponível nesta sessão.")
            rows = friends_service.list_friends(current_user_id)
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

        if name == "calendar_list_friend_events":
            friend_user_id_raw = str(arguments.get("friend_user_id") or "").strip()
            friend_name = str(arguments.get("friend_name") or "").strip()
            friend_user_id, error = _resolve_friend_user_id(
                friends_service,
                current_user_id,
                friend_user_id_raw,
                friend_name,
            )
            if error:
                return _tool_error(error)
            assert friend_user_id is not None
            from_iso = cast(str | None, arguments.get("from_iso"))
            to_iso = cast(str | None, arguments.get("to_iso"))
            if not from_iso and not to_iso:
                rf, rt = _current_week_range_local()
            else:
                rf = _parse_iso_dt(from_iso, current_user_timezone) if from_iso else None
                rt = _parse_iso_dt(to_iso, current_user_timezone) if to_iso else None
            try:
                rows = calendar_service.list_friend_events(current_user_id, friend_user_id, rf, rt)
            except PermissionError as exc:
                return _tool_error(str(exc))
            return _tool_ok(rows)

        if name == "calendar_create_friend_event":
            friend_user_id_raw = str(arguments.get("friend_user_id") or "").strip()
            friend_name = str(arguments.get("friend_name") or "").strip()
            friend_user_id, error = _resolve_friend_user_id(
                friends_service,
                current_user_id,
                friend_user_id_raw,
                friend_name,
            )
            if error:
                return _tool_error(error)
            assert friend_user_id is not None
            title = str(arguments.get("title") or "").strip()
            if not title:
                return _tool_error("Título do evento é obrigatório.")
            starts_at = _parse_iso_dt(str(arguments.get("starts_at")), current_user_timezone)
            ends_at = _parse_iso_dt(str(arguments.get("ends_at")), current_user_timezone)
            event_type = str(arguments.get("event_type") or "personal")
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
            try:
                result = calendar_service.create_friend_event_or_request(
                    current_user_id,
                    friend_user_id,
                    current_user_name or "Um usuário",
                    title=title,
                    starts_at=starts_at,
                    ends_at=ends_at,
                    event_type=event_type,
                    color=(color.strip() if isinstance(color, str) and color.strip() else None),
                    description=(description.strip() if isinstance(description, str) and description.strip() else None),
                    status=status,
                    guests=guests,
                )
            except PermissionError as exc:
                return _tool_error(str(exc))
            return _tool_ok(result)

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

        if name == "notes_share_note":
            friend_user_id_raw = str(arguments.get("friend_user_id") or "").strip()
            friend_name = str(arguments.get("friend_name") or "").strip()
            friend_user_id, friend_error = _resolve_friend_user_id(
                friends_service,
                current_user_id,
                friend_user_id_raw,
                friend_name,
            )
            if friend_error:
                return _tool_error(friend_error)
            note_id_raw = str(arguments.get("note_id") or "").strip()
            note_title = str(arguments.get("note_title") or "").strip()
            note_id, note_error = _resolve_note_id(notes_service, current_user_id, note_id_raw, note_title)
            if note_error:
                return _tool_error(note_error)
            role = str(arguments.get("role") or "editor")
            if role not in ("editor", "viewer"):
                role = "editor"
            assert friend_user_id is not None and note_id is not None
            try:
                row = notes_service.share_note(
                    current_user_id,
                    note_id=note_id,
                    target_user_id=friend_user_id,
                    role=role,
                    actor_name=current_user_name or "Um usuário",
                )
            except ValueError as exc:
                return _tool_error(str(exc))
            if not row:
                return _tool_error("Nota não encontrada ou você não é dono dela.")
            return _tool_ok(row)

        if name in (
            "contacts_list_contacts",
            "contacts_create_contact",
            "contacts_update_contact",
            "contacts_delete_contact",
        ):
            if contacts_service is None:
                return _tool_error("Serviço de contatos indisponível nesta sessão.")

            if name == "contacts_list_contacts":
                rows = contacts_service.list_contacts(current_user_id)
                return _tool_ok(rows)

            if name == "contacts_create_contact":
                name_in = str(arguments.get("name") or "").strip()
                email_in = str(arguments.get("email") or "").strip()
                if not name_in:
                    return _tool_error("Informe o nome do contato.")
                if not email_in:
                    return _tool_error("Informe o e-mail do contato.")
                try:
                    row = contacts_service.create_contact(
                        current_user_id,
                        name=name_in,
                        email=email_in,
                    )
                except DuplicateContactEmailError as exc:
                    return _tool_error(str(exc))
                except ValueError as exc:
                    return _tool_error(str(exc))
                return _tool_ok(row)

            if name == "contacts_update_contact":
                contact_id = str(arguments.get("contact_id") or "").strip()
                if not contact_id:
                    return _tool_error("contact_id é obrigatório.")
                name_raw = arguments.get("name")
                email_raw = arguments.get("email")
                name_in = (
                    str(name_raw).strip()
                    if name_raw is not None and str(name_raw).strip()
                    else None
                )
                email_in = (
                    str(email_raw).strip()
                    if email_raw is not None and str(email_raw).strip()
                    else None
                )
                if name_in is None and email_in is None:
                    return _tool_error("Informe nome e/ou e-mail para atualizar.")
                try:
                    row = contacts_service.update_contact(
                        current_user_id,
                        contact_id,
                        name=name_in,
                        email=email_in,
                    )
                except DuplicateContactEmailError as exc:
                    return _tool_error(str(exc))
                except ValueError as exc:
                    return _tool_error(str(exc))
                if not row:
                    return _tool_error("Contato não encontrado.")
                return _tool_ok(row)

            if name == "contacts_delete_contact":
                contact_id = str(arguments.get("contact_id") or "").strip()
                if not contact_id:
                    return _tool_error("contact_id é obrigatório.")
                ok = contacts_service.delete_contact(current_user_id, contact_id)
                if not ok:
                    return _tool_error("Contato não encontrado.")
                return _tool_ok({"deleted": True})

        if name == "web_browse_page":
            url = str(arguments.get("url") or "").strip()
            if not url:
                return _tool_error("Informe a URL pública da página.")
            try:
                return _tool_ok(browse_public_page(url))
            except ValueError as exc:
                return _tool_error(str(exc))
            except TimeoutError:
                return _tool_error("Tempo esgotado ao abrir a página.")
            except Exception as exc:
                return _tool_error(f"Não consegui abrir a página: {exc}")

        if name in (
            "agents_list_agents",
            "agents_create_agent",
            "agents_add_instruction",
            "agents_authorize_agent",
        ):
            if agents_service is None:
                return _tool_error("Serviço de agentes indisponível nesta sessão.")

            if name == "agents_list_agents":
                rows = agents_service.list_agents(current_user_id)
                return _tool_ok([_agent_public(row) for row in rows])

            if name == "agents_create_agent":
                task = str(arguments.get("task") or "").strip()
                if not task:
                    return _tool_error("Descreva a tarefa do agente.")
                agent_type = str(arguments.get("type") or "custom").strip()
                if agent_type not in ("research", "shopping", "travel", "custom"):
                    agent_type = "custom"
                effort = str(arguments.get("effort") or "medium").strip()
                if effort not in ("low", "medium", "high"):
                    effort = "medium"
                name_raw = arguments.get("name")
                name_val = str(name_raw).strip() if name_raw is not None and str(name_raw).strip() else None
                row = agents_service.create_agent(
                    current_user_id,
                    task=task,
                    agent_type=agent_type,
                    effort=effort,
                    name=name_val,
                )
                return _tool_ok(_agent_public(row))

            if name == "agents_add_instruction":
                instruction = str(arguments.get("instruction") or "").strip()
                if not instruction:
                    return _tool_error("Informe a instrução adicional para o agente.")
                agent_name = str(arguments.get("agent_name") or "").strip()
                agent_id = str(arguments.get("agent_id") or "").strip()
                rows = agents_service.list_agents(current_user_id)
                resolved, error = _resolve_editable_agent_id(rows, agent_name, agent_id)
                if error:
                    return _tool_error(error)
                assert resolved is not None
                message = agents_service.create_message(current_user_id, resolved, instruction)
                agent_row = next((row for row in agents_service.list_agents(current_user_id) if str(row.get("id")) == resolved), None)
                payload = _agent_public(agent_row) if agent_row else {"instruction_added": True}
                payload["instruction_added"] = True
                payload["instruction"] = message.get("content") if isinstance(message, dict) else instruction
                return _tool_ok(payload)

            if name == "agents_authorize_agent":
                agent_name = str(arguments.get("agent_name") or "").strip()
                agent_id = str(arguments.get("agent_id") or "").strip()
                if agent_name:
                    rows = agents_service.list_agents(current_user_id)
                    resolved = _find_agent_id_by_name(rows, agent_name)
                    if not resolved:
                        available = ", ".join(str(row.get("name") or "") for row in rows[:5])
                        suffix = f" Agentes disponíveis: {available}." if available else ""
                        return _tool_error(f"Não encontrei um agente com esse nome.{suffix}")
                    agent_id = resolved
                if not agent_id:
                    return _tool_error("Informe o nome do agente que deve ser autorizado.")
                row = agents_service.authorize_agent(current_user_id, agent_id)
                return _tool_ok(_agent_public(row))

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
