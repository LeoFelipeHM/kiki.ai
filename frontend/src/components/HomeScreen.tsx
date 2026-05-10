import { Calendar, CheckCircle2, Circle, Clock, Menu, MessageCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VoiceChatOrb } from './VoiceChatOrb';
import { useTheme } from './ThemeProvider';
import { useAppShell } from '@/context/AppShellContext';
import { AuthSessionExpiredError } from '@/services/auth';
import { patchCalendarEvent } from '@/services/calendar';
import type { CalendarEvent } from '@/types/calendar';

interface HomeScreenProps {
  onNavigateToChat?: () => void;
  onNavigateToCalendar?: (viewMode?: 'day' | 'week' | 'month' | 'year') => void;
  onNavigateToProfile?: () => void;
  onOpenMenu?: () => void;
  events: CalendarEvent[];
  userName?: string;
}

function isTaskDone(event: CalendarEvent): boolean {
  return (event.status ?? 'confirmed') === 'completed';
}

export function HomeScreen({ onNavigateToChat, onNavigateToCalendar, onNavigateToProfile, onOpenMenu, events, userName = 'Maria' }: HomeScreenProps) {
  const { themeColor } = useTheme();
  const { setEvents, onSessionExpired } = useAppShell();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
  const [timeRemaining, setTimeRemaining] = useState('');
  const [minutesUntilEvent, setMinutesUntilEvent] = useState(0);
  const [isEventSoon, setIsEventSoon] = useState(false);

  const now = new Date();
  const todayEvents = events
    .filter((event) => isSameDay(parseISO(event.startsAt), now))
    .sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime());

  /** Compromissos que não são tarefas (tarefas ficam no card principal). */
  const todayCommitments = todayEvents.filter((e) => e.type !== 'task');
  const upcomingCommitments = todayCommitments.filter((event) => parseISO(event.startsAt) >= now);
  const nextEvent =
    upcomingCommitments.length > 0 ? upcomingCommitments[0] : todayCommitments[0];

  const todayTaskEvents = useMemo(
    () =>
      events
        .filter((e) => e.type === 'task' && isSameDay(parseISO(e.startsAt), new Date()))
        .sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime()),
    [events],
  );

  const completedTasks = todayTaskEvents.filter(isTaskDone).length;
  const totalTasks = todayTaskEvents.length;
  const progressPercentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  const toggleTaskComplete = useCallback(
    async (event: CalendarEvent) => {
      const nextStatus = isTaskDone(event) ? 'confirmed' : 'completed';
      try {
        const updated = await patchCalendarEvent(event.id, { status: nextStatus });
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) onSessionExpired();
      }
    },
    [setEvents, onSessionExpired],
  );

  const nextEventTime = nextEvent ? parseISO(nextEvent.startsAt) : new Date();

  useEffect(() => {
    const updateTimeRemaining = () => {
      if (!nextEvent) {
        setIsEventSoon(false);
        return;
      }

      const now = new Date();
      const diff = nextEventTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Acontecendo agora');
        setIsEventSoon(true);
        setMinutesUntilEvent(0);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Só mostra se faltar menos de 1 hora
      if (hours === 0 && minutes <= 60) {
        setIsEventSoon(true);
        setMinutesUntilEvent(minutes);
        setTimeRemaining(`${minutes} min`);
      } else {
        setIsEventSoon(false);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [nextEvent, events]);

  const getDailySummary = () => {
    const pendingTasks = todayTaskEvents.filter((t) => !isTaskDone(t)).length;
    const eventsRemaining = upcomingCommitments.length;

    let title = 'Seu dia está em andamento';
    let completedText = '';
    let pendingText = '';
    let insight = '';

    if (currentHour < 12) {
      title = 'Bom começo de dia';
    } else if (currentHour >= 18) {
      title = 'Finalizando o dia';
    } else if (totalTasks > 0 && progressPercentage >= 80) {
      title = 'Você está quase lá';
    }

    if (completedTasks > 0) {
      completedText = `${completedTasks} ${completedTasks === 1 ? 'tarefa concluída' : 'tarefas concluídas'}`;
    }

    const pendingItems = [];
    if (pendingTasks > 0) {
      pendingItems.push(`${pendingTasks} ${pendingTasks === 1 ? 'tarefa' : 'tarefas'}`);
    }
    if (eventsRemaining > 0) {
      pendingItems.push(`${eventsRemaining} ${eventsRemaining === 1 ? 'compromisso' : 'compromissos'}`);
    }

    if (pendingItems.length > 0) {
      pendingText = pendingItems.join(' e ');
    }

    if (totalTasks > 0 && progressPercentage >= 80 && eventsRemaining === 0) {
      insight = 'Você está no controle';
    } else if (totalTasks > 0 && progressPercentage >= 50) {
      insight = 'Mantendo o ritmo';
    } else if (pendingTasks === 0 && eventsRemaining > 0) {
      insight = 'Foco nos compromissos';
    }

    return { title, completedText, pendingText, insight };
  };

  const summary = getDailySummary();
  const taskListVisible = todayTaskEvents.slice(0, 5);
  const taskOverflow = todayTaskEvents.length - taskListVisible.length;

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-hide bg-background">
        <div className="px-6 pt-8 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <button
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-base font-medium text-muted-foreground">Kiki</h1>
            <button
              onClick={onNavigateToProfile}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-sm btn-apple-gradient shadow-sm`}
            >
              <span className="text-white font-medium">{userName.charAt(0).toUpperCase()}</span>
            </button>
          </div>

          {/* Greeting */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold mb-2 tracking-tight">{greeting}, {userName.split(' ')[0]}</h2>
            <p className="text-base text-muted-foreground capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          {/* Hero Card — mesmo efeito de brilho do avatar (btn-apple-gradient no theme.css) */}
          <div
            className={`relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br ${themeColor} btn-apple-gradient shadow-xl`}
          >
            <div className="relative z-10 px-6 py-8">
              {/* Daily Summary */}
              <div className="mb-8">
                <h3 className="text-white font-semibold text-lg mb-3">
                  {summary.title}
                </h3>
                <div className="space-y-1.5 text-white/90 text-sm leading-relaxed">
                  {summary.completedText && (
                    <p>{summary.completedText}</p>
                  )}
                  {summary.pendingText && (
                    <p>Ainda faltam {summary.pendingText}</p>
                  )}
                  {summary.insight && (
                    <p className="text-white/75 italic mt-2">{summary.insight}</p>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <p className="text-white/90 text-xs font-semibold uppercase tracking-wide mb-3">
                  Tarefas de hoje
                </p>
                {taskListVisible.length === 0 ? (
                  <p className="text-white/75 text-sm">Nenhuma tarefa agendada para hoje.</p>
                ) : (
                  <ul className="space-y-2">
                    {taskListVisible.map((task) => {
                      const done = isTaskDone(task);
                      return (
                        <li key={task.id}>
                          <div className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors pl-2 pr-3 py-2.5">
                            <button
                              type="button"
                              aria-label={done ? 'Marcar tarefa como pendente' : 'Marcar tarefa como concluída'}
                              className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
                              onClick={() => void toggleTaskComplete(task)}
                            >
                              {done ? (
                                <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={2} />
                              ) : (
                                <Circle className="w-6 h-6 text-white/90" strokeWidth={2} />
                              )}
                            </button>
                            <button
                              type="button"
                              className={`flex-1 min-w-0 text-left text-sm leading-snug ${done ? 'text-white/75 line-through' : 'text-white'}`}
                              onClick={() => onNavigateToCalendar?.('day')}
                            >
                              <span className="block truncate">{task.title}</span>
                            </button>
                            <span className="flex-shrink-0 text-xs text-white/70 tabular-nums">
                              {format(parseISO(task.startsAt), 'HH:mm')}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {taskOverflow > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigateToCalendar?.('day')}
                    className="mt-3 text-sm text-white/85 underline underline-offset-2 hover:text-white"
                  >
                    + {taskOverflow} {taskOverflow === 1 ? 'tarefa' : 'tarefas'} no calendário
                  </button>
                )}
              </div>

              <button
                onClick={onNavigateToChat}
                className="w-full bg-white hover:bg-white/95 text-purple-600 font-semibold py-4 px-6 rounded-full transition-all btn-apple shadow-lg"
              >
                <div className="flex items-center justify-center gap-2.5">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-base">Conversar com Kiki</span>
                </div>
              </button>
            </div>
          </div>

          {/* Upcoming Events */}
          {(isEventSoon || todayCommitments.length > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                Próximos compromissos
              </h3>
              <div className="space-y-3">
                {isEventSoon && nextEvent && (
                  <button
                    onClick={() => onNavigateToCalendar?.('day')}
                    className="w-full bg-white hover:bg-gray-50 rounded-2xl p-4 transition-all btn-apple shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold mb-0.5 truncate">{nextEvent.title}</p>
                        <p className="text-xs text-orange-600 font-medium">
                          {minutesUntilEvent === 0 ? 'Acontecendo agora' : `Começa em ${minutesUntilEvent} min`}
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {todayCommitments.slice(isEventSoon ? 1 : 0, 2).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onNavigateToCalendar?.('day')}
                    className="w-full bg-white hover:bg-gray-50 rounded-2xl p-4 transition-all btn-apple shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${themeColor} flex items-center justify-center flex-shrink-0`}>
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold mb-0.5 truncate">{event.title}</p>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.startsAt), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <VoiceChatOrb />
    </>
  );
}
