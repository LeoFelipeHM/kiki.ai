import {
  addDays,
  addMonths,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  formatISO,
  getDay,
  getDaysInMonth,
  isSameDay,
  max as dfMax,
  min as dfMin,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { CalendarEvent } from '@/types/calendar';

/** Semana começa no domingo (cabeçalho Dom–Sáb). */
export const WEEK_STARTS_ON = 0 as const;

export function dayKeyFromDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function mergeEventsById(prev: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
  const map = new Map(prev.map((e) => [e.id, e]));
  for (const e of incoming) map.set(e.id, e);
  return Array.from(map.values());
}

/** Intervalo visível da âncora + modo (dia/semana/mês/ano). */
export function visibleRange(
  anchor: Date,
  viewMode: 'day' | 'week' | 'month' | 'year',
): { from: Date; to: Date } {
  switch (viewMode) {
    case 'day':
      return { from: startOfDay(anchor), to: endOfDay(anchor) };
    case 'week':
      return {
        from: startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
        to: endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
      };
    case 'month':
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case 'year':
      return {
        from: startOfDay(new Date(anchor.getFullYear(), 0, 1)),
        to: endOfDay(new Date(anchor.getFullYear(), 11, 31)),
      };
    default:
      return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
}

/** Expande o intervalo para sempre incluir o dia atual (útil para Home + lista única). */
export function fetchRangeIncludingToday(
  anchor: Date,
  viewMode: 'day' | 'week' | 'month' | 'year',
): { from: Date; to: Date } {
  const v = visibleRange(anchor, viewMode);
  const t0 = startOfDay(new Date());
  const t1 = endOfDay(new Date());
  return {
    from: dfMin([v.from, t0]),
    to: dfMax([v.to, t1]),
  };
}

export function seedHomeCalendarRange(): { from: Date; to: Date } {
  const today = new Date();
  return {
    from: startOfDay(addDays(today, -14)),
    to: endOfDay(addDays(today, 120)),
  };
}

export function placement(event: CalendarEvent): {
  dayKey: string;
  startHour: number;
  duration: number;
} {
  const start = parseISO(event.startsAt);
  const end = parseISO(event.endsAt);
  const dayKey = dayKeyFromDate(start);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const duration = Math.max(0.25, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  return { dayKey, startHour, duration };
}

export function buildIsoRange(
  dateKey: string,
  startHour: number,
  durationHours: number,
): { startsAt: string; endsAt: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const whole = Math.floor(startHour);
  const minutes = Math.round((startHour - whole) * 60);
  const start = new Date(y, m - 1, d, whole, minutes, 0, 0);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function moveEventToSlot(
  event: CalendarEvent,
  newDateKey: string,
  newStartHour: number,
): CalendarEvent {
  const { duration } = placement(event);
  const { startsAt, endsAt } = buildIsoRange(newDateKey, newStartHour, duration);
  return { ...event, startsAt, endsAt };
}

export function resizeEventDuration(event: CalendarEvent, newDurationHours: number): CalendarEvent {
  const { startsAt } = event;
  const start = parseISO(startsAt);
  const end = new Date(start.getTime() + Math.max(0.25, newDurationHours) * 60 * 60 * 1000);
  return { ...event, endsAt: end.toISOString() };
}

export function shiftStartHour(event: CalendarEvent, newStartHour: number): CalendarEvent {
  const { duration } = placement(event);
  const dk = dayKeyFromDate(parseISO(event.startsAt));
  return { ...event, ...buildIsoRange(dk, newStartHour, duration) };
}

/** Colunas da semana (domingo → sábado). */
export function weekColumns(weekStart: Date): { date: Date; dayKey: string; weekdayShort: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      dayKey: dayKeyFromDate(date),
      weekdayShort: format(date, 'EEE', { locale: ptBR }),
    };
  });
}

export function weekStartForDate(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON });
}

export function formatCalendarTitle(
  anchor: Date,
  viewMode: 'day' | 'week' | 'month' | 'year',
): string {
  switch (viewMode) {
    case 'day':
      return format(anchor, "d 'de' MMMM yyyy", { locale: ptBR });
    case 'week': {
      const ws = weekStartForDate(anchor);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${format(ws, 'd', { locale: ptBR })}–${format(we, "d 'de' MMMM yyyy", { locale: ptBR })}`;
      }
      return `${format(ws, "d MMM", { locale: ptBR })} – ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    case 'month':
      return format(anchor, 'MMMM yyyy', { locale: ptBR });
    case 'year':
      return format(anchor, 'yyyy');
    default:
      return format(anchor, 'PPP', { locale: ptBR });
  }
}

export function monthGridCells(monthAnchor: Date): ({ date: Date } | null)[] {
  const start = startOfMonth(monthAnchor);
  const dim = getDaysInMonth(monthAnchor);
  const lead = getDay(start);
  const cells: ({ date: Date } | null)[] = Array.from({ length: lead }, () => null);
  for (let dayNum = 1; dayNum <= dim; dayNum++) {
    cells.push({ date: new Date(start.getFullYear(), start.getMonth(), dayNum) });
  }
  return cells;
}

export function isoQuery(d: Date): string {
  return formatISO(d);
}

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(parseISO(e.startsAt), day));
}

export function eventsTouchingMonth(events: CalendarEvent[], monthStart: Date): CalendarEvent[] {
  const from = startOfMonth(monthStart);
  const to = endOfMonth(monthStart);
  return events.filter((e) => {
    const s = parseISO(e.startsAt);
    return s >= from && s <= to;
  });
}

export function shiftAnchor(anchor: Date, viewMode: 'day' | 'week' | 'month' | 'year', dir: -1 | 1): Date {
  switch (viewMode) {
    case 'day':
      return addDays(anchor, dir);
    case 'week':
      return addDays(anchor, dir * 7);
    case 'month':
      return addMonths(anchor, dir);
    case 'year':
      return addYears(anchor, dir);
    default:
      return anchor;
  }
}
