export type CalendarEventType = 'meeting' | 'task' | 'personal';

/** Modelo alinhado ao backend: intervalo absoluto em ISO 8601. */
export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  type: CalendarEventType;
  /** confirmed | completed (tarefas concluídas), etc. */
  status?: string;
  guests?: string[];
  description?: string;
  color?: string;
}
