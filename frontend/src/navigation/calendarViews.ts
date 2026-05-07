export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

const VALID: CalendarViewMode[] = ['day', 'week', 'month', 'year'];

export function parseCalendarViewParam(raw: string | null): CalendarViewMode {
  if (raw && VALID.includes(raw as CalendarViewMode)) {
    return raw as CalendarViewMode;
  }
  return 'week';
}
