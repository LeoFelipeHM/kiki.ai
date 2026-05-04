import { ChevronLeft, ChevronRight, Plus, Clock, AlertCircle, Sparkles, X, Users, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { VoiceChatOrb } from './VoiceChatOrb';

import type { CalendarEvent } from '@/types/calendar';

interface CalendarScreenProps {
  onOpenMenu?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHome?: () => void;
  initialViewMode?: 'day' | 'week' | 'month' | 'year';
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

const EVENT_COLORS = {
  meeting: 'bg-blue-500',
  task: 'bg-purple-500',
  personal: 'bg-pink-500',
};

const PASTEL_COLORS = [
  { name: 'Lavanda', value: 'bg-purple-500' },
  { name: 'Rosa', value: 'bg-pink-500' },
  { name: 'Azul', value: 'bg-blue-500' },
  { name: 'Verde', value: 'bg-green-500' },
  { name: 'Pêssego', value: 'bg-orange-500' },
];

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function EventCard({
  event,
  onClick,
  onResize,
}: {
  event: CalendarEvent;
  onClick: () => void;
  onResize: (id: number, newDuration: number) => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'event',
    item: { id: event.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [initialDuration, setInitialDuration] = useState(0);

  const handleClick = (e: React.MouseEvent) => {
    if (!isResizing) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    setInitialDuration(event.duration);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStartY;
    const hoursDelta = Math.round(deltaY / HOUR_HEIGHT * 2) / 2; // Snap para 30 minutos
    const newDuration = Math.max(0.5, initialDuration + hoursDelta);

    onResize(event.id, newDuration);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStartY, initialDuration]);

  const maxLines = Math.floor((event.duration * HOUR_HEIGHT - 20) / 12);

  return (
    <div
      ref={drag}
      onClick={handleClick}
      className={`absolute left-1 right-1 rounded p-2 cursor-pointer event-card-apple ${
        event.color || EVENT_COLORS[event.type]
      } text-white shadow-md ${isDragging || isResizing ? 'opacity-50 scale-95' : 'opacity-100'}`}
      style={{
        top: `${event.startHour * HOUR_HEIGHT + 2}px`,
        height: `${event.duration * HOUR_HEIGHT - 4}px`,
        zIndex: isDragging || isResizing ? 50 : 10,
      }}
    >
      <div className="h-full flex items-start justify-start overflow-hidden">
        <p
          className="text-[10px] font-medium leading-[12px] text-left break-words overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {event.title}
        </p>
      </div>

      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 transition-colors group"
        style={{ zIndex: 100 }}
      >
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/40 rounded-full group-hover:bg-white/60 transition-colors" />
      </div>
    </div>
  );
}

function TimeSlot({
  day,
  hour,
  onDrop,
  hasEvent,
  onClick,
}: {
  day: number;
  hour: number;
  onDrop: (eventId: number, day: number, hour: number) => void;
  hasEvent: boolean;
  onClick: () => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'event',
    drop: (item: { id: number }) => onDrop(item.id, day, hour),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`border-b border-border transition-all cursor-pointer ${
        isOver ? 'bg-purple-100 dark:bg-purple-900/20 border-purple-500' : hasEvent ? '' : 'hover:bg-muted/50'
      }`}
      style={{ height: `${HOUR_HEIGHT}px` }}
      onClick={() => !hasEvent && onClick()}
    />
  );
}

function DayColumn({
  day,
  dayName,
  events,
  onDrop,
  conflicts,
  onSlotClick,
  onEventClick,
  onEventResize,
}: {
  day: number;
  dayName: string;
  events: CalendarEvent[];
  onDrop: (eventId: number, day: number, hour: number) => void;
  conflicts: number[];
  onSlotClick: (day: number, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventResize: (id: number, newDuration: number) => void;
}) {
  return (
    <div className="relative h-full">
      {HOURS.map((hour) => {
        const hasEvent = events.some((e) => e.day === day && e.startHour === hour);
        const hasConflict = conflicts.includes(hour);
        return (
          <div key={hour} className="relative">
            <TimeSlot
              day={day}
              hour={hour}
              onDrop={onDrop}
              hasEvent={hasEvent}
              onClick={() => onSlotClick(day, hour)}
            />
            {hasConflict && (
              <div className="absolute top-1 right-1 z-30">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {events
        .filter((e) => e.day === day)
        .map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => onEventClick(event)}
            onResize={onEventResize}
          />
        ))}
    </div>
  );
}

export function CalendarScreen({ onOpenMenu, onNavigateToProfile, onNavigateToHome, initialViewMode = 'week', events, setEvents }: CalendarScreenProps) {
  const [showKikiSuggestion, setShowKikiSuggestion] = useState(true);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>(initialViewMode);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const weekDays = Array.from({ length: 7 }, (_, i) => ({ day: 27 + i, name: WEEK_DAYS[i] }));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
    };

    if (showViewMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showViewMenu]);

  useEffect(() => {
    if (viewMode !== 'year') {
      setShowKikiSuggestion(true);
    }
  }, [viewMode]);

  const handleVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (hoursScrollRef.current && e.currentTarget !== hoursScrollRef.current) {
      hoursScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    if (contentScrollRef.current && e.currentTarget !== contentScrollRef.current) {
      contentScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleDrop = (eventId: number, newDay: number, newHour: number) => {
    setEvents((prev) => {
      const updated = prev.map((event) =>
        event.id === eventId ? { ...event, day: newDay, startHour: newHour } : event
      );

      const hasConflicts = detectConflicts(newDay).length > 0;
      setShowConflictWarning(hasConflicts);

      return updated;
    });
  };

  const detectConflicts = (day: number): number[] => {
    const dayEvents = events.filter((e) => e.day === day);
    const conflicts: number[] = [];

    dayEvents.forEach((event1) => {
      dayEvents.forEach((event2) => {
        if (event1.id !== event2.id) {
          const event1End = event1.startHour + event1.duration;
          const event2End = event2.startHour + event2.duration;

          if (
            (event1.startHour < event2End && event1End > event2.startHour) ||
            (event2.startHour < event1End && event2End > event1.startHour)
          ) {
            conflicts.push(event1.startHour);
            conflicts.push(event2.startHour);
          }
        }
      });
    });

    return [...new Set(conflicts)];
  };

  const applyKikiSuggestion = () => {
    setEvents((prev) =>
      prev.map((event) =>
        event.title === 'Foco profundo' ? { ...event, startHour: 9 } : event
      )
    );
    setShowKikiSuggestion(false);
  };

  const handleSlotClick = (day: number, hour: number) => {
    const newEvent: CalendarEvent = {
      id: Math.max(...events.map((e) => e.id), 0) + 1,
      title: '',
      day,
      startHour: hour,
      duration: 1,
      type: 'task',
      color: PASTEL_COLORS[0].value,
    };
    setEditingEvent(newEvent);
    setIsCreatingNew(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent({ ...event, color: event.color || PASTEL_COLORS[0].value });
    setIsCreatingNew(false);
  };

  const handleSaveEvent = () => {
    if (!editingEvent) return;

    if (isCreatingNew) {
      setEvents((prev) => [...prev, editingEvent]);
    } else {
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? editingEvent : e))
      );
    }

    setEditingEvent(null);
    setIsCreatingNew(false);
  };

  const handleDeleteEvent = () => {
    if (!editingEvent) return;

    if (!isCreatingNew) {
      setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id));
    }

    setEditingEvent(null);
    setIsCreatingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
    setIsCreatingNew(false);
  };

  const handleEventResize = (id: number, newDuration: number) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, duration: newDuration } : e))
    );
  };

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <div className="px-5 pt-6 pb-3 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-base font-medium text-muted-foreground">Kiki</h1>
            <button
              onClick={onNavigateToProfile}
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm btn-apple-gradient shadow-sm`}
            >
              <span className="text-white font-medium">M</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Planejamento</h2>
            <button
              onClick={() => {
                setEditingEvent({
                  id: Date.now(),
                  title: '',
                  day: 28,
                  startHour: 9,
                  duration: 1,
                  type: 'task',
                  color: PASTEL_COLORS[0].value,
                });
                setIsCreatingNew(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl btn-apple-gradient shadow-md hover:shadow-lg transition-all`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Novo</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-3 relative" ref={viewMenuRef}>
            <button className="w-9 h-9 rounded-xl bg-card border border-border hover:bg-muted flex items-center justify-center btn-apple transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="hover:bg-muted px-4 py-2 rounded-xl btn-apple transition-colors"
            >
              <h3 className="text-sm font-medium">
                {viewMode === 'day'
                  ? '28 de Abril 2026'
                  : viewMode === 'week'
                  ? 'Semana - Abril 2026'
                  : viewMode === 'month'
                  ? 'Abril 2026'
                  : '2026'}
              </h3>
            </button>
            <button className="w-9 h-9 rounded-xl bg-card border border-border hover:bg-muted flex items-center justify-center btn-apple transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>

            {showViewMenu && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-[200] min-w-[110px]">
                {(['day', 'week', 'month', 'year'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setViewMode(mode);
                      setShowViewMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-muted btn-apple ${
                      viewMode === mode ? 'bg-purple-500/10 text-purple-500' : ''
                    }`}
                  >
                    {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Ano'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showKikiSuggestion && viewMode !== 'year' && (
            <div className="mt-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-3 overflow-hidden">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-2">
                    {viewMode === 'day' && (
                      <>
                        Você tem 3 compromissos hoje. Sugiro reservar 30min de pausa entre reuniões para melhor produtividade.
                      </>
                    )}
                    {viewMode === 'week' && (
                      <>
                        Sugiro mover <span className="font-medium">"Foco profundo"</span> para 9h. Você
                        é mais produtivo pela manhã!
                      </>
                    )}
                    {viewMode === 'month' && (
                      <>
                        Este mês tem 12 reuniões agendadas. Sugiro bloquear terças e quintas de manhã para trabalho focado.
                      </>
                    )}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={applyKikiSuggestion}
                      className="px-3 py-1.5 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full text-xs btn-apple-gradient"
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => setShowKikiSuggestion(false)}
                      className="px-3 py-1.5 bg-muted rounded-full text-xs hover:bg-muted/80 btn-apple"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showConflictWarning && (
            <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-3 overflow-hidden">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-2">
                    Detectei um <span className="font-medium">conflito de horário</span>. Quer que eu
                    reorganize automaticamente?
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setShowConflictWarning(false)}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-full text-xs btn-apple-gradient"
                    >
                      Ver conflitos
                    </button>
                    <button
                      onClick={() => setShowConflictWarning(false)}
                      className="px-3 py-1.5 bg-muted rounded-full text-xs hover:bg-muted/80 btn-apple"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'week' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-10 flex-shrink-0 bg-background border-r border-border z-30">
              <div className="h-[42px] border-b border-border" />
              <div
                ref={hoursScrollRef}
                className="overflow-y-auto scrollbar-hide"
                style={{ height: 'calc(100% - 42px)' }}
                onScroll={handleVerticalScroll}
              >
                <div className="relative pt-2">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="relative flex items-start justify-center"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span className="text-[10px] text-muted-foreground bg-background px-1 -mt-2.5">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                      <div className="absolute bottom-0 left-0 right-0 border-b border-border" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex flex-shrink-0 border-b border-border bg-background" style={{ height: '42px' }}>
                {weekDays.map((item) => {
                  const isToday = item.day === 28;
                  return (
                    <div key={item.day} className="flex-1">
                      <div
                        className={`text-center py-1.5 rounded-xl m-0.5 ${
                          isToday ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' : ''
                        }`}
                      >
                        <p className="text-[10px] opacity-70">{item.name}</p>
                        <p className="text-xs font-medium">{item.day}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                ref={contentScrollRef}
                className="flex-1 overflow-y-auto scrollbar-hide"
                onScroll={handleVerticalScroll}
              >
                <div className="flex pt-1.5 h-full">
                  {weekDays.map((item) => (
                    <div key={item.day} className="flex-1">
                      <DayColumn
                        day={item.day}
                        dayName={item.name}
                        events={events}
                        onDrop={handleDrop}
                        conflicts={detectConflicts(item.day)}
                        onSlotClick={handleSlotClick}
                        onEventClick={handleEventClick}
                        onEventResize={handleEventResize}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 bg-background z-40 border-b border-border">
              <div className="flex" style={{ height: '42px' }}>
                <div className="w-10 flex-shrink-0 border-r border-border" />
                <div className="flex-1 px-3">
                  <div className="text-center py-1.5 rounded-xl m-0.5 bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    <p className="text-[10px] opacity-70">Segunda-feira</p>
                    <p className="text-xs font-medium">28 de Abril</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide border-t border-border">
              <div className="flex">
                <div className="w-10 flex-shrink-0 bg-background border-r border-border">
                  <div className="relative pt-1.5">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="relative flex items-start justify-center"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <span className="text-[9px] text-muted-foreground bg-background px-0.5 -mt-2">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        <div className="absolute bottom-0 left-0 right-0 border-b border-border" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 px-3">
                  <DayColumn
                    day={28}
                    dayName="Seg"
                    events={events}
                    onDrop={handleDrop}
                    conflicts={detectConflicts(28)}
                    onSlotClick={handleSlotClick}
                    onEventClick={handleEventClick}
                    onEventResize={handleEventResize}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'month' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 30 }, (_, i) => {
                  const day = i + 1;
                  const dayEvents = events.filter((e) => e.day === day);
                  const isToday = day === 28;
                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-xl p-2 border transition-all ${
                        isToday
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-purple-500'
                          : 'border-border hover:border-purple-500/50'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{day}</div>
                      {dayEvents.length > 0 && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className={`text-[8px] px-1 py-0.5 rounded ${event.color || EVENT_COLORS[event.type]} text-white truncate`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[8px] text-muted-foreground">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'year' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 12 }, (_, monthIndex) => (
                  <div key={monthIndex} className="border border-border rounded-xl p-3">
                    <h4 className="mb-2 text-center text-sm">
                      {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][monthIndex]}
                    </h4>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 30 }, (_, i) => {
                        const day = i + 1;
                        const hasEvent = monthIndex === 3 && events.some((e) => e.day === day);
                        return (
                          <div
                            key={day}
                            className={`aspect-square rounded text-[8px] flex items-center justify-center ${
                              hasEvent ? 'bg-purple-500 text-white' : 'hover:bg-muted'
                            }`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {editingEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-3">
            <div className="bg-background rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl">
              <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
                <h2 className="text-lg">{isCreatingNew ? 'Novo Compromisso' : 'Editar Evento'}</h2>
                <button
                  onClick={handleCancelEdit}
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center btn-apple"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)]">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1.5 text-muted-foreground">Título</label>
                    <input
                      type="text"
                      value={editingEvent.title}
                      onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                      placeholder="Digite o título do compromisso"
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1.5 text-muted-foreground">Hora início</label>
                      <select
                        value={editingEvent.startHour}
                        onChange={(e) => setEditingEvent({ ...editingEvent, startHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs mb-1.5 text-muted-foreground">Duração</label>
                      <select
                        value={editingEvent.duration}
                        onChange={(e) => setEditingEvent({ ...editingEvent, duration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple"
                      >
                        {[1, 2, 3, 4, 5, 6].map((d) => (
                          <option key={d} value={d}>
                            {d}h
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs mb-1.5 text-muted-foreground">Tipo</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['meeting', 'task', 'personal'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setEditingEvent({ ...editingEvent, type })}
                          className={`py-2.5 rounded-xl border-2 btn-apple ${
                            editingEvent.type === type
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-border hover:border-purple-500/50'
                          }`}
                        >
                          <span className="text-xs">
                            {type === 'meeting' ? 'Reunião' : type === 'task' ? 'Tarefa' : 'Pessoal'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs mb-1.5 text-muted-foreground">Cor</label>
                    <div className="flex gap-2">
                      {PASTEL_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setEditingEvent({ ...editingEvent, color: color.value })}
                          className={`w-10 h-10 rounded-full ${color.value} btn-apple transition-all ${
                            editingEvent.color === color.value
                              ? 'ring-2 ring-offset-2 ring-purple-500 scale-110'
                              : 'hover:scale-105'
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs mb-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      Convidados
                    </label>
                    <input
                      type="text"
                      value={editingEvent.guests?.join(', ') || ''}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          guests: e.target.value.split(',').map((g) => g.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Separar por vírgula"
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple"
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1.5 text-muted-foreground">Descrição</label>
                    <textarea
                      value={editingEvent.description || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple resize-none"
                      placeholder="Adicione detalhes..."
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-background border-t border-border px-5 py-3 flex gap-2">
                {!isCreatingNew && (
                  <button
                    onClick={handleDeleteEvent}
                    className="px-4 py-2.5 text-sm rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 btn-apple"
                  >
                    Excluir
                  </button>
                )}
                <button
                  onClick={handleCancelEdit}
                  className={`px-4 py-2.5 text-sm rounded-xl bg-muted hover:bg-muted/80 btn-apple ${isCreatingNew ? '' : 'flex-1'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={!editingEvent.title.trim()}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white btn-apple-gradient disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </DndProvider>

      <VoiceChatOrb />
    </>
  );
}
