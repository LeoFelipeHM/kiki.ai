import { useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  isNotificationApiSupported,
  showBrowserNotification,
  type BrowserNotificationKind,
} from '@/lib/browserNotifications';
import type { NotificationPreferencesDto } from '@/services/settings';
import type { CalendarEvent, CalendarEventType } from '@/types/calendar';

/**
 * Quanto tempo (em minutos) antes do início do evento dispara a notificação,
 * por tipo de evento. Pequenos o suficiente para não lotar a barra de notificações.
 */
const LEAD_MINUTES: Record<CalendarEventType, number[]> = {
  meeting: [10],
  task: [5],
  personal: [10],
};

/** Janela de tolerância (segundos) para considerar que estamos no slot do lead time. */
const LEAD_TOLERANCE_SECONDS = 90;

/** Hora local em que o resumo diário é disparado (uma vez por dia). */
const DAILY_SUMMARY_HOUR = 8;

/** Hora local em que o relatório semanal é disparado (toda segunda-feira). */
const WEEKLY_REPORT_HOUR = 8;

/** Limite de itens incluídos no corpo de resumos. */
const SUMMARY_MAX_ITEMS = 3;

const DELIVERED_STORAGE_KEY = 'kiki.notifications.delivered';
const DELIVERED_RETENTION_MS = 1000 * 60 * 60 * 36; // 36h

type DeliveredMap = Record<string, number>;

function loadDelivered(): DeliveredMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DELIVERED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: DeliveredMap = {};
    const cutoff = Date.now() - DELIVERED_RETENTION_MS;
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && v > cutoff) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function saveDelivered(map: DeliveredMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DELIVERED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignora (cota cheia / privado)
  }
}

function eventTypeIsAllowed(
  type: CalendarEventType,
  prefs: NotificationPreferencesDto,
): boolean {
  switch (type) {
    case 'meeting':
      return prefs.meetings_enabled;
    case 'task':
      return prefs.tasks_enabled;
    case 'personal':
      return prefs.reminders_enabled;
    default:
      return true;
  }
}

function buildLeadTitle(
  type: CalendarEventType,
  leadMinutes: number,
  reminderStyle: string,
): string {
  const prefix = (() => {
    switch (reminderStyle) {
      case 'professional':
        return 'Lembrete';
      case 'motivational':
        return 'Vamos lá';
      default:
        return 'Kiki lembrete';
    }
  })();
  if (leadMinutes <= 0) {
    if (type === 'meeting') return `${prefix}: começa agora`;
    if (type === 'task') return `${prefix}: hora da tarefa`;
    return `${prefix}: começa agora`;
  }
  if (type === 'meeting') return `${prefix}: reunião em ${leadMinutes} min`;
  if (type === 'task') return `${prefix}: tarefa em ${leadMinutes} min`;
  return `${prefix}: começa em ${leadMinutes} min`;
}

function buildLeadBody(event: CalendarEvent): string {
  const start = parseISO(event.startsAt);
  const horaFmt = format(start, 'HH:mm');
  return `${event.title} • ${horaFmt}`;
}

interface SchedulerHandlers {
  onMeetingClick?: () => void;
  onTaskClick?: () => void;
  onSummaryClick?: () => void;
}

interface UseNotificationSchedulerArgs extends SchedulerHandlers {
  /** Habilita o agendamento (false enquanto não autenticado). */
  enabled: boolean;
  events: CalendarEvent[];
  prefs: NotificationPreferencesDto | null;
}

/**
 * Agenda e dispara notificações do navegador conforme as preferências do usuário.
 *
 * Funciona apenas enquanto a aba está aberta (sem Service Worker). Para cada evento,
 * dispara um lembrete antes do início. Resumo diário/semanal são disparados em
 * horários fixos locais.
 */
export function useNotificationScheduler({
  enabled,
  events,
  prefs,
  onMeetingClick,
  onTaskClick,
  onSummaryClick,
}: UseNotificationSchedulerArgs): void {
  const eventsRef = useRef<CalendarEvent[]>(events);
  const prefsRef = useRef<NotificationPreferencesDto | null>(prefs);
  const handlersRef = useRef<SchedulerHandlers>({
    onMeetingClick,
    onTaskClick,
    onSummaryClick,
  });
  const deliveredRef = useRef<DeliveredMap>(loadDelivered());

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);
  useEffect(() => {
    handlersRef.current = { onMeetingClick, onTaskClick, onSummaryClick };
  }, [onMeetingClick, onTaskClick, onSummaryClick]);

  useEffect(() => {
    if (!enabled) return;
    if (!isNotificationApiSupported()) return;

    const markDelivered = (key: string) => {
      deliveredRef.current[key] = Date.now();
      saveDelivered(deliveredRef.current);
    };

    const wasDelivered = (key: string) => key in deliveredRef.current;

    const fire = (
      key: string,
      kind: BrowserNotificationKind,
      title: string,
      body: string | undefined,
      onClick: (() => void) | undefined,
    ) => {
      const p = prefsRef.current;
      if (!p) return;
      if (!p.push_enabled) return;
      const result = showBrowserNotification({
        title,
        body,
        tag: `kiki:${kind}:${key}`,
        withSound: p.sound_enabled,
        withVibration: p.vibration_enabled,
        onClick,
      });
      if (result) markDelivered(key);
    };

    const tick = () => {
      const p = prefsRef.current;
      if (!p) return;
      if (!p.push_enabled) return;
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const nowMs = now.getTime();

      for (const event of eventsRef.current) {
        const type = event.type;
        if (!eventTypeIsAllowed(type, p)) continue;
        if ((event.status ?? 'confirmed') === 'completed') continue;

        const start = parseISO(event.startsAt).getTime();
        const leadList = LEAD_MINUTES[type] ?? LEAD_MINUTES.personal;
        for (const lead of leadList) {
          const target = start - lead * 60_000;
          const diffMs = nowMs - target;
          if (diffMs < 0) continue;
          if (diffMs > LEAD_TOLERANCE_SECONDS * 1000) continue;
          const key = `event:${event.id}:lead:${lead}`;
          if (wasDelivered(key)) continue;
          const title = buildLeadTitle(type, lead, p.reminder_style);
          const body = buildLeadBody(event);
          const onClick =
            type === 'meeting'
              ? handlersRef.current.onMeetingClick
              : type === 'task'
                ? handlersRef.current.onTaskClick
                : handlersRef.current.onMeetingClick;
          fire(key, type === 'task' ? 'task' : 'meeting', title, body, onClick);
        }
      }

      if (p.daily_summary_enabled) {
        const dayKey = format(now, 'yyyy-MM-dd');
        const summaryKey = `daily:${dayKey}`;
        if (
          !wasDelivered(summaryKey) &&
          now.getHours() >= DAILY_SUMMARY_HOUR &&
          now.getHours() < DAILY_SUMMARY_HOUR + 4
        ) {
          const todays = eventsRef.current.filter((e) => {
            const s = parseISO(e.startsAt);
            return (
              s.getFullYear() === now.getFullYear() &&
              s.getMonth() === now.getMonth() &&
              s.getDate() === now.getDate() &&
              s.getTime() >= nowMs
            );
          });
          const upcomingCount = todays.length;
          const title =
            upcomingCount === 0
              ? 'Bom dia! Sem compromissos hoje'
              : `Bom dia! ${upcomingCount} ${upcomingCount === 1 ? 'item' : 'itens'} hoje`;
          const sample = todays
            .slice(0, SUMMARY_MAX_ITEMS)
            .map((e) => `${format(parseISO(e.startsAt), 'HH:mm')} ${e.title}`)
            .join(' • ');
          const body =
            upcomingCount === 0
              ? `Aproveite o ${format(now, "EEEE", { locale: ptBR })} :)`
              : sample +
                (upcomingCount > SUMMARY_MAX_ITEMS
                  ? ` • +${upcomingCount - SUMMARY_MAX_ITEMS}`
                  : '');
          fire(
            summaryKey,
            'daily_summary',
            title,
            body,
            handlersRef.current.onSummaryClick,
          );
        }
      }

      if (p.weekly_report_enabled && now.getDay() === 1) {
        const dayKey = format(now, 'yyyy-MM-dd');
        const weeklyKey = `weekly:${dayKey}`;
        if (
          !wasDelivered(weeklyKey) &&
          now.getHours() >= WEEKLY_REPORT_HOUR &&
          now.getHours() < WEEKLY_REPORT_HOUR + 4
        ) {
          const weekStart = nowMs - 7 * 24 * 60 * 60 * 1000;
          const past = eventsRef.current.filter((e) => {
            const s = parseISO(e.startsAt).getTime();
            return s >= weekStart && s <= nowMs;
          });
          const completed = past.filter((e) => (e.status ?? 'confirmed') === 'completed').length;
          const title = 'Relatório semanal';
          const body = `${completed}/${past.length} concluídos nos últimos 7 dias`;
          fire(weeklyKey, 'weekly_report', title, body, handlersRef.current.onSummaryClick);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
