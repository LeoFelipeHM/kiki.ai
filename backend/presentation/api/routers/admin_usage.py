from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status

from infrastructure.persistence.postgres_usage_repository import PostgresUsageRepository
from presentation.api.dependencies import AdminUserDep, DbConnDep
from presentation.api.schemas.admin_usage import (
    UsageSummaryResponse,
    UsageTimeseriesResponse,
    UsageTimeseriesRow,
    UsageTotals,
    UsageUserRow,
)

router = APIRouter(prefix="/admin/usage", tags=["admin"])

_BRASILIA = ZoneInfo("America/Sao_Paulo")


def _resolve_range(
    date_from: date | None,
    date_to: date | None,
) -> tuple[datetime, datetime]:
    """Retorna [start, end] em UTC para filtrar TIMESTAMPTZ; datas explícitas são dias em Brasília."""
    if date_from is None and date_to is None:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=30)
        return start, end
    if date_from is None or date_to is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe date_from e date_to juntos ou omita ambos (últimos 30 dias).",
        )
    if date_to < date_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_to deve ser maior ou igual a date_from.",
        )
    start = datetime.combine(date_from, time.min, tzinfo=_BRASILIA).astimezone(timezone.utc)
    end = datetime.combine(date_to, time(23, 59, 59, 999999), tzinfo=_BRASILIA).astimezone(
        timezone.utc
    )
    return start, end


@router.get("/summary", response_model=UsageSummaryResponse)
def usage_summary(
    _admin: AdminUserDep,
    conn: DbConnDep,
    date_from: Annotated[
        date | None,
        Query(
            description="Início do período (calendário America/Sao_Paulo). Omitir junto com date_to = últimos 30 dias.",
        ),
    ] = None,
    date_to: Annotated[
        date | None,
        Query(
            description="Fim do período (calendário America/Sao_Paulo, inclusive). Omitir junto com date_from = últimos 30 dias.",
        ),
    ] = None,
):
    start, end = _resolve_range(date_from, date_to)
    repo = PostgresUsageRepository(conn)
    totals_raw = repo.fetch_totals(start, end)
    totals = UsageTotals(**totals_raw)
    rows = repo.fetch_per_user(start, end)
    users = [
        UsageUserRow(
            user_id=r["user_id"],
            name=r["name"],
            email=r["email"],
            accesses=r["accesses"],
            chat_completion=r["chat_completion"],
            voice_session=r["voice_session"],
            events_created=r["events_created"],
        )
        for r in rows
    ]
    return UsageSummaryResponse(period_from=start, period_to=end, totals=totals, users=users)


@router.get("/timeseries", response_model=UsageTimeseriesResponse)
def usage_timeseries(
    _admin: AdminUserDep,
    conn: DbConnDep,
    date_from: Annotated[
        date | None,
        Query(
            description="Início do período (calendário America/Sao_Paulo). Omitir junto com date_to = últimos 30 dias.",
        ),
    ] = None,
    date_to: Annotated[
        date | None,
        Query(
            description="Fim do período (calendário America/Sao_Paulo, inclusive). Omitir junto com date_from = últimos 30 dias.",
        ),
    ] = None,
):
    start, end = _resolve_range(date_from, date_to)
    repo = PostgresUsageRepository(conn)
    raw_series = repo.fetch_timeseries(start, end)
    series = [UsageTimeseriesRow(**row) for row in raw_series]
    return UsageTimeseriesResponse(period_from=start, period_to=end, series=series)
