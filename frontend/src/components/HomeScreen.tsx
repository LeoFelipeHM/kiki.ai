import { Calendar, Clock, Menu, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VoiceChatOrb } from './VoiceChatOrb';
import { useTheme } from './ThemeProvider';
import type { CalendarEvent } from '@/types/calendar';

interface HomeScreenProps {
  onNavigateToChat?: () => void;
  onNavigateToCalendar?: (viewMode?: 'day' | 'week' | 'month' | 'year') => void;
  onNavigateToProfile?: () => void;
  onOpenMenu?: () => void;
  events: CalendarEvent[];
  userName?: string;
}

export function HomeScreen({ onNavigateToChat, onNavigateToCalendar, onNavigateToProfile, onOpenMenu, events, userName = 'Maria' }: HomeScreenProps) {
  const { themeColor } = useTheme();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
  const [timeRemaining, setTimeRemaining] = useState('');
  const [minutesUntilEvent, setMinutesUntilEvent] = useState(0);
  const [isEventSoon, setIsEventSoon] = useState(false);

  const now = new Date();
  const todayEvents = events
    .filter((event) => isSameDay(parseISO(event.startsAt), now))
    .sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime());

  const upcomingEvents = todayEvents.filter((event) => parseISO(event.startsAt) >= now);
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : todayEvents[0];

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

  const todayTasks = [
    { id: 1, title: 'Finalizar relatório trimestral', completed: true },
    { id: 2, title: 'Revisar proposta comercial', completed: false },
    { id: 3, title: 'Preparar apresentação Q2', completed: false },
  ];

  const completedTasks = todayTasks.filter(t => t.completed).length;
  const totalTasks = todayTasks.length;
  const progressPercentage = (completedTasks / totalTasks) * 100;

  const getProductivityMessage = () => {
    if (progressPercentage >= 80) return 'Ótimo progresso hoje!';
    if (progressPercentage >= 50) return 'Você está indo bem';
    if (progressPercentage > 0) return 'Continue assim';
    return 'Vamos começar?';
  };

  const getDailySummary = () => {
    const pendingTasks = todayTasks.filter(t => !t.completed).length;
    const eventsRemaining = upcomingEvents.length;

    let title = 'Seu dia está em andamento';
    let completedText = '';
    let pendingText = '';
    let insight = '';

    // Title based on time and progress
    if (currentHour < 12) {
      title = 'Bom começo de dia';
    } else if (currentHour >= 18) {
      title = 'Finalizando o dia';
    } else if (progressPercentage >= 80) {
      title = 'Você está quase lá';
    }

    // Completed items
    if (completedTasks > 0) {
      completedText = `${completedTasks} ${completedTasks === 1 ? 'tarefa concluída' : 'tarefas concluídas'}`;
    }

    // Pending items
    const pendingItems = [];
    if (pendingTasks > 0) {
      pendingItems.push(`${pendingTasks} ${pendingTasks === 1 ? 'tarefa' : 'tarefas'}`);
    }
    if (eventsRemaining > 0) {
      pendingItems.push(`${eventsRemaining} ${eventsRemaining === 1 ? 'reunião' : 'reuniões'}`);
    }

    if (pendingItems.length > 0) {
      pendingText = pendingItems.join(' e ');
    }

    // Insight
    if (progressPercentage >= 80 && eventsRemaining === 0) {
      insight = 'Você está no controle';
    } else if (progressPercentage >= 50) {
      insight = 'Mantendo o ritmo';
    } else if (pendingTasks === 0 && eventsRemaining > 0) {
      insight = 'Foco nas reuniões';
    }

    return { title, completedText, pendingText, insight };
  };

  const summary = getDailySummary();

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

          {/* Hero Card - Primary Focus */}
          <div className="relative rounded-3xl overflow-hidden mb-12 shadow-xl">
            <div className={`absolute inset-0 bg-gradient-to-br ${themeColor}`} />
            <div className="relative px-6 py-8">
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
          {(isEventSoon || todayEvents.length > 0) && (
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

                {todayEvents.slice(isEventSoon ? 1 : 0, 2).map((event) => (
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
