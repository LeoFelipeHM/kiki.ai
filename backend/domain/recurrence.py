"""Expansão de recorrência para eventos (limites explícitos para evitar abuso e sobrecarga)."""

from __future__ import annotations

from calendar import monthrange
from datetime import datetime, timedelta
from typing import Literal

from domain.calendar import RecurrenceValidationError

RecurrenceFrequency = Literal["daily", "weekly", "monthly", "yearly"]

# Limites globais (série gerada para a Kiki / API)
MAX_RECURRENCE_INSTANCES = 100
MAX_RECURRENCE_SPAN_DAYS = 730  # horizonte máximo a partir do primeiro início

# Intervalo máximo por frequência (ex.: a cada 30 dias, não "cada 400 dias")
_MAX_INTERVAL_BY_FREQ: dict[RecurrenceFrequency, int] = {
    "daily": 30,
    "weekly": 26,
    "monthly": 24,
    "yearly": 10,
}


def _max_interval_for(frequency: RecurrenceFrequency) -> int:
    return _MAX_INTERVAL_BY_FREQ[frequency]


def _add_months(dt: datetime, months: int) -> datetime:
    total_month = dt.month - 1 + months
    year = dt.year + total_month // 12
    month = total_month % 12 + 1
    last_day = monthrange(year, month)[1]
    day = min(dt.day, last_day)
    return dt.replace(year=year, month=month, day=day)


def _next_start(
    current: datetime,
    frequency: RecurrenceFrequency,
    interval: int,
) -> datetime:
    if interval < 1:
        raise RecurrenceValidationError("interval deve ser >= 1.")
    if frequency == "daily":
        return current + timedelta(days=interval)
    if frequency == "weekly":
        return current + timedelta(weeks=interval)
    if frequency == "monthly":
        return _add_months(current, interval)
    if frequency == "yearly":
        return _add_months(current, 12 * interval)
    raise RecurrenceValidationError("Frequência de recorrência inválida.")


def expand_recurrence(
    starts_at: datetime,
    ends_at: datetime,
    *,
    frequency: RecurrenceFrequency,
    interval: int = 1,
    count: int | None = None,
    until: datetime | None = None,
) -> list[tuple[datetime, datetime]]:
    """
    Gera (starts_at, ends_at) para cada ocorrência, inclusive a primeira.

    Informe `count` (total de ocorrências desejadas) e/ou `until` (último instante em que
    o *início* de uma ocorrência ainda é permitido). Ambos podem aparecer; a série para
    no primeiro limite atingido. Os tetos globais MAX_RECURRENCE_INSTANCES e
    MAX_RECURRENCE_SPAN_DAYS são sempre aplicados.
    """
    if ends_at <= starts_at:
        raise RecurrenceValidationError("ends_at deve ser maior que starts_at.")
    if count is None and until is None:
        raise RecurrenceValidationError("Informe count (quantidade) e/ou until (data limite) para a recorrência.")
    if count is not None and count < 1:
        raise RecurrenceValidationError("count deve ser >= 1.")
    if until is not None and until < starts_at:
        raise RecurrenceValidationError("until não pode ser anterior ao primeiro starts_at.")

    cap_interval = _max_interval_for(frequency)
    if interval < 1 or interval > cap_interval:
        raise RecurrenceValidationError(
            f"Para frequência '{frequency}', interval deve estar entre 1 e {cap_interval}."
        )

    duration = ends_at - starts_at
    span_limit_end = starts_at + timedelta(days=MAX_RECURRENCE_SPAN_DAYS)

    max_slots = MAX_RECURRENCE_INSTANCES
    if count is not None:
        max_slots = min(max_slots, count)

    out: list[tuple[datetime, datetime]] = []
    cur_start = starts_at
    while len(out) < max_slots:
        if cur_start > span_limit_end:
            break
        if until is not None and cur_start > until:
            break
        out.append((cur_start, cur_start + duration))
        cur_start = _next_start(cur_start, frequency, interval)

    if count is not None and len(out) < count:
        raise RecurrenceValidationError(
            f"A série pedida ({count} ocorrências) não cabe nos limites: no máximo "
            f"{MAX_RECURRENCE_INSTANCES} ocorrências e horizonte de {MAX_RECURRENCE_SPAN_DAYS} dias "
            "a partir do primeiro evento (e até `until`, se houver). Reduza count, intervalo ou until."
        )

    if not out:
        raise RecurrenceValidationError("Nenhuma ocorrência válida com os parâmetros informados.")

    return out
