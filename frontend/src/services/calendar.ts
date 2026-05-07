import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';
import type { CalendarEvent, CalendarEventType } from '@/types/calendar';
import { isoQuery } from '@/lib/calendarUtils';

interface CalendarGuestApi {
  id: string;
  name: string;
  email: string | null;
}

interface CalendarEventApi {
  id: string;
  user_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  event_type: string;
  color: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  guests: CalendarGuestApi[];
}

export function mapApiEventToCalendarEvent(row: CalendarEventApi): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    type: row.event_type as CalendarEventType,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    guests: row.guests?.map((g) => g.name) ?? [],
  };
}

async function parseCalendarError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Não foi possível salvar o evento.');
}

export async function fetchCalendarEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
  const qs = new URLSearchParams({
    from: isoQuery(from),
    to: isoQuery(to),
  });
  let res: Response;
  try {
    res = await authorizedFetch(`/calendar/events?${qs}`);
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível carregar o calendário.');
  }
  if (!res.ok) {
    throw new Error(await parseCalendarError(res));
  }
  const rows: CalendarEventApi[] = await res.json();
  return rows.map(mapApiEventToCalendarEvent);
}

export interface CreateCalendarPayload {
  title: string;
  startsAt: string;
  endsAt: string;
  eventType: CalendarEventType;
  color?: string | null;
  description?: string | null;
  status?: string;
  guests?: { name: string; email?: string | null }[];
}

export async function createCalendarEvent(payload: CreateCalendarPayload): Promise<CalendarEvent> {
  const body = {
    title: payload.title,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt,
    event_type: payload.eventType,
    color: payload.color ?? null,
    description: payload.description ?? null,
    status: payload.status ?? 'confirmed',
    guests: (payload.guests ?? []).map((g) => ({ name: g.name, email: g.email ?? null })),
  };

  let res: Response;
  try {
    res = await authorizedFetch('/calendar/events', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível criar o evento.');
  }

  if (!res.ok) throw new Error(await parseCalendarError(res));
  const row: CalendarEventApi = await res.json();
  return mapApiEventToCalendarEvent(row);
}

export interface PatchCalendarPayload {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  eventType?: CalendarEventType;
  color?: string | null;
  description?: string | null;
  status?: string;
  guests?: { name: string; email?: string | null }[];
}

export async function patchCalendarEvent(id: string, payload: PatchCalendarPayload): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.startsAt !== undefined) body.starts_at = payload.startsAt;
  if (payload.endsAt !== undefined) body.ends_at = payload.endsAt;
  if (payload.eventType !== undefined) body.event_type = payload.eventType;
  if (payload.color !== undefined) body.color = payload.color;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.guests !== undefined) {
    body.guests = payload.guests.map((g) => ({ name: g.name, email: g.email ?? null }));
  }

  let res: Response;
  try {
    res = await authorizedFetch(`/calendar/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível atualizar o evento.');
  }

  if (!res.ok) throw new Error(await parseCalendarError(res));
  const row: CalendarEventApi = await res.json();
  return mapApiEventToCalendarEvent(row);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  let res: Response;
  try {
    res = await authorizedFetch(`/calendar/events/${id}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível excluir o evento.');
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseCalendarError(res));
  }
}
