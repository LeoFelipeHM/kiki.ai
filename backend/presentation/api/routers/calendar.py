from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from application.calendar_service import CalendarService
from domain.calendar import InvalidEventIntervalError
from presentation.api.dependencies import CurrentUserDep, get_calendar_service
from presentation.api.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventPatch,
    CalendarEventResponse,
    CalendarGuestResponse,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])

CalendarServiceDep = Annotated[CalendarService, Depends(get_calendar_service)]


def _event_to_response(row: dict) -> CalendarEventResponse:
    guests = [CalendarGuestResponse(**g) for g in row.get("guests", [])]
    payload = {**row, "guests": guests}
    return CalendarEventResponse(**payload)


@router.get("/events", response_model=list[CalendarEventResponse])
def list_calendar_events(
    current_user: CurrentUserDep,
    calendar_service: CalendarServiceDep,
    range_from: Annotated[
        str | None,
        Query(alias="from", description="ISO 8601 início do intervalo"),
    ] = None,
    range_to: Annotated[
        str | None,
        Query(alias="to", description="ISO 8601 fim do intervalo"),
    ] = None,
):
    def parse_iso(value: str | None):
        if value is None:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parâmetro de data inválido (use ISO 8601).",
            ) from exc

    rf = parse_iso(range_from)
    rt = parse_iso(range_to)
    rows = calendar_service.list_events(str(current_user["id"]), rf, rt)
    return [_event_to_response(r) for r in rows]


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
def create_calendar_event(
    payload: CalendarEventCreate,
    current_user: CurrentUserDep,
    calendar_service: CalendarServiceDep,
):
    guests = [(g.name, g.email) for g in payload.guests]
    try:
        row = calendar_service.create_event(
            str(current_user["id"]),
            title=payload.title,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            event_type=payload.event_type,
            color=payload.color,
            description=payload.description,
            status=payload.status,
            guests=guests,
        )
        return _event_to_response(row)
    except InvalidEventIntervalError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/events/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(
    event_id: str,
    current_user: CurrentUserDep,
    calendar_service: CalendarServiceDep,
):
    row = calendar_service.get_event(str(current_user["id"]), event_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")
    return _event_to_response(row)


@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
def patch_calendar_event(
    event_id: str,
    payload: CalendarEventPatch,
    current_user: CurrentUserDep,
    calendar_service: CalendarServiceDep,
):
    guests_replace = "guests" in payload.model_dump(exclude_unset=True)
    guest_tuples = [(g.name, g.email) for g in (payload.guests or [])] if guests_replace else None
    try:
        row = calendar_service.update_event(
            str(current_user["id"]),
            event_id,
            title=payload.title,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            event_type=payload.event_type,
            color=payload.color,
            description=payload.description,
            status=payload.status,
            guests_replace=guests_replace,
            guests=guest_tuples,
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")
        return _event_to_response(row)
    except InvalidEventIntervalError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(
    event_id: str,
    current_user: CurrentUserDep,
    calendar_service: CalendarServiceDep,
):
    if not calendar_service.delete_event(str(current_user["id"]), event_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")
    return None
