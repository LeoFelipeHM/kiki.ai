import {
  AlertCircle,
  AlignJustify,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppNotificationsBell } from './HomeNotificationsBell';
import { VoiceChatOrb } from './VoiceChatOrb';

import {
  buildIsoRange,
  dayKeyFromDate,
  fetchRangeIncludingToday,
  mergeEventsById,
  monthGridCells,
  moveEventToSlot,
  placement,
  resizeEventDuration,
  shiftAnchor,
  weekColumns,
  weekStartForDate,
  eventsForDay,
  eventsTouchingMonth,
} from '@/lib/calendarUtils';
import {
  createCalendarEvent,
  createFriendCalendarEventRequest,
  deleteCalendarEvent,
  fetchCalendarEvents,
  fetchFriendCalendarEvents,
  patchCalendarEvent,
} from '@/services/calendar';
import { fetchFriends, type Friend } from '@/services/friends';
import { AuthSessionExpiredError } from '@/services/auth';
import type { CalendarEvent, CalendarEventType } from '@/types/calendar';

interface EditingDraft {
  id: string;
  title: string;
  dateKey: string;
  startHour: number;
  duration: number;
  type: CalendarEventType;
  guests: string[];
  guestFriendIds: string[];
  description: string;
  color: string;
}

interface CalendarScreenProps {
  onOpenMenu?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToHome?: () => void;
  onSessionExpired?: () => void;
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

const DEFAULT_HOUR_HEIGHT = 60;
const MIN_HOUR_HEIGHT = 28;
const MAX_HOUR_HEIGHT = 120;
const HOUR_HEIGHT_ZOOM_STEP = 6;
const QUARTER_STEP = 0.25;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Início do dia em incrementos de 15 min (00:00 … 23:45). */
const START_HOUR_OPTIONS = Array.from({ length: 96 }, (_, i) => i * QUARTER_STEP);
/** Durações de 15 em 15 min até 12 h. */
const DURATION_OPTIONS = Array.from({ length: 48 }, (_, i) => (i + 1) * QUARTER_STEP);

function formatHourOptionLabel(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

function formatDurationLabel(d: number): string {
  const totalMin = Math.round(d * 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(d);
  const m = Math.round((d - h) * 60);
  if (m === 0) return h === 1 ? '1 h' : `${h} h`;
  return `${h} h ${m} min`;
}

function snapQuarterHour(h: number): number {
  return Math.round(Math.min(Math.max(h, 0), 23.75) * 4) / 4;
}

function pixelYToSnappedHour(y: number, hourHeight: number): number {
  const clamped = Math.max(0, Math.min(y, 24 * hourHeight - 1));
  return snapQuarterHour(clamped / hourHeight);
}

function nearestDuration(d: number): number {
  return DURATION_OPTIONS.reduce((best, x) => (Math.abs(x - d) < Math.abs(best - d) ? x : best));
}

function EventCard({
  event,
  hourHeight,
  onClick,
  onResize,
}: {
  event: CalendarEvent;
  hourHeight: number;
  onClick: () => void;
  onResize: (id: string, newDuration: number) => void;
}) {
  const placed = placement(event);
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
    setInitialDuration(placed.duration);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStartY;
    const hoursDelta = Math.round((deltaY / hourHeight) * 4) / 4;
    const newDuration = Math.max(QUARTER_STEP, initialDuration + hoursDelta);

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
  }, [isResizing, resizeStartY, initialDuration, hourHeight]);

  const maxLines = Math.max(1, Math.floor((placed.duration * hourHeight - 20) / 12));

  return (
    <div
      ref={(node) => {
        drag(node);
      }}
      onClick={handleClick}
      className={`absolute left-1 right-1 rounded p-2 cursor-pointer event-card-apple ${
        event.color || EVENT_COLORS[event.type]
      } text-white shadow-md ${isDragging || isResizing ? 'opacity-50 scale-95' : 'opacity-100'}`}
      style={{
        top: `${placed.startHour * hourHeight + 2}px`,
        height: `${placed.duration * hourHeight - 4}px`,
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

function CalendarHeaderDayDrop({
  dayKey,
  onDropKeepTime,
  className,
  children,
}: {
  dayKey: string;
  onDropKeepTime: (eventId: string, dayKey: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'event',
      drop: (item: { id: string }) => onDropKeepTime(item.id, dayKey),
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    }),
    [dayKey, onDropKeepTime],
  );
  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      className={`${className ?? ''} ${isOver ? 'ring-2 ring-purple-500/80 ring-inset bg-purple-500/10 rounded-xl' : ''}`}
    >
      {children}
    </div>
  );
}

function MonthEventChip({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'event',
    item: { id: event.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  return (
    <div
      ref={(node) => {
        drag(node);
      }}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`w-full text-left text-[8px] px-1 py-0.5 rounded ${event.color || EVENT_COLORS[event.type]} text-white truncate cursor-grab active:cursor-grabbing outline-none ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {event.title}
    </div>
  );
}

function MonthDayDroppable({
  date,
  isToday,
  onDropKeepTime,
  children,
}: {
  date: Date;
  isToday: boolean;
  onDropKeepTime: (eventId: string, dayKey: string) => void;
  children: React.ReactNode;
}) {
  const dk = dayKeyFromDate(date);
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'event',
      drop: (item: { id: string }) => onDropKeepTime(item.id, dk),
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [dk, onDropKeepTime],
  );
  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      className={`aspect-square rounded-xl p-2 border transition-all ${
        isToday
          ? 'border-purple-500/50 bg-purple-500/5 text-purple-600'
          : 'border-border hover:border-purple-500/50'
      } ${isOver ? 'ring-2 ring-purple-400 scale-[1.02] z-10' : ''}`}
    >
      {children}
    </div>
  );
}

function DayColumn({
  dayKey,
  events,
  hourHeight,
  onDrop,
  conflicts,
  onSlotClick,
  onEventClick,
  onEventResize,
}: {
  dayKey: string;
  events: CalendarEvent[];
  hourHeight: number;
  onDrop: (eventId: string, dayKey: string, startHour: number) => void;
  conflicts: number[];
  onSlotClick: (dayKey: string, startHour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventResize: (id: string, newDuration: number) => void;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const dayEvents = events.filter((e) => placement(e).dayKey === dayKey);
  const gridHeight = 24 * hourHeight;

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'event',
      drop: (item: { id: string }, monitor) => {
        const node = columnRef.current;
        const cur = monitor.getClientOffset();
        if (!node || !cur) return;
        const bounds = node.getBoundingClientRect();
        const y = cur.y - bounds.top;
        onDrop(item.id, dayKey, pixelYToSnappedHour(y, hourHeight));
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [dayKey, hourHeight, onDrop],
  );

  const setDropRef = (node: HTMLDivElement | null) => {
    drop(node);
    columnRef.current = node;
  };

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.event-card-apple')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onSlotClick(dayKey, pixelYToSnappedHour(y, hourHeight));
  };

  return (
    <div
      ref={setDropRef}
      role="presentation"
      className={`relative w-full cursor-pointer transition-colors ${
        isOver ? 'bg-purple-100/80 dark:bg-purple-900/25 ring-1 ring-inset ring-purple-400/50' : 'bg-transparent'
      }`}
      style={{ minHeight: gridHeight }}
      onClick={handleColumnClick}
    >
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="pointer-events-none absolute left-0 right-0 z-[1] box-border border-b border-border"
          style={{ top: hour * hourHeight, height: hourHeight }}
        >
          {[1, 2, 3].map((q) => (
            <div
              key={q}
              className="absolute left-0 right-0 border-t border-border/45 dark:border-border/55"
              style={{ top: q * (hourHeight / 4) }}
            />
          ))}
        </div>
      ))}

      {conflicts.map((hour) => (
        <div
          key={`conf-${hour}`}
          className="pointer-events-none absolute top-1 right-1 z-30"
          style={{ top: hour * hourHeight + 4 }}
        >
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        </div>
      ))}

      {dayEvents.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          hourHeight={hourHeight}
          onClick={() => onEventClick(event)}
          onResize={onEventResize}
        />
      ))}
    </div>
  );
}

export function CalendarScreen({
  onOpenMenu,
  onNavigateToNotifications,
  onSessionExpired,
  initialViewMode = 'week',
  events,
  setEvents,
}: CalendarScreenProps) {
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditingDraft | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>(initialViewMode);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showAgendaMenu, setShowAgendaMenu] = useState(false);
  const [eventDropdown, setEventDropdown] = useState<'start' | 'duration' | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [hourHeightPx, setHourHeightPx] = useState(DEFAULT_HOUR_HEIGHT);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState('');

  const viewMenuRef = useRef<HTMLDivElement>(null);
  const agendaMenuRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);
  const guestPickerRef = useRef<HTMLDivElement>(null);
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const calendarSwipeRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const suppressSwipeClickRef = useRef(false);

  const todayKey = dayKeyFromDate(new Date());
  const selectedFriend = friends.find((friend) => friend.friendUserId === selectedFriendId) ?? null;
  const visibleCalendarFriends = friends.filter((friend) => friend.canViewCalendar);

  const weekStart = useMemo(() => weekStartForDate(anchorDate), [anchorDate]);
  const weekDayCols = useMemo(() => weekColumns(weekStart), [weekStart]);

  const defaultNewDayKey = useCallback(() => {
    if (viewMode === 'day') return dayKeyFromDate(startOfDay(anchorDate));
    if (weekDayCols.some((c) => c.dayKey === todayKey)) return todayKey;
    return weekDayCols[0]?.dayKey ?? todayKey;
  }, [viewMode, anchorDate, weekDayCols, todayKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setSyncLoading(true);
      setSyncError(null);
      try {
        const range = fetchRangeIncludingToday(anchorDate, viewMode);
        const list = selectedFriendId
          ? await fetchFriendCalendarEvents(selectedFriendId, range.from, range.to)
          : await fetchCalendarEvents(range.from, range.to);
        if (!cancelled) setEvents(list);
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) {
          onSessionExpired?.();
        } else if (!cancelled) {
          setSyncError(e instanceof Error ? e.message : 'Erro ao carregar eventos.');
        }
      } finally {
        if (!cancelled) setSyncLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anchorDate, viewMode, selectedFriendId, setEvents, onSessionExpired]);

  useEffect(() => {
    void (async () => {
      try {
        setFriends(await fetchFriends());
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      }
    })();
  }, [onSessionExpired]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (viewMenuRef.current && !viewMenuRef.current.contains(target)) {
        setShowViewMenu(false);
      }
      if (agendaMenuRef.current && !agendaMenuRef.current.contains(target)) {
        setShowAgendaMenu(false);
      }
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(target)) {
        setEventDropdown(null);
      }
      if (guestPickerRef.current && !guestPickerRef.current.contains(target)) {
        setShowGuestPicker(false);
      }
    };

    if (showViewMenu || showAgendaMenu || eventDropdown || showGuestPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showViewMenu, showAgendaMenu, eventDropdown, showGuestPicker]);

  const scrollToNow = useCallback(() => {
    if (viewMode !== 'day' && viewMode !== 'week') return;
    const now = new Date();
    const nowHour = now.getHours() + now.getMinutes() / 60;
    const top = Math.max(0, Math.round(nowHour * hourHeightPx - hourHeightPx * 2));

    if (viewMode === 'week') {
      if (contentScrollRef.current) contentScrollRef.current.scrollTop = top;
      if (hoursScrollRef.current) hoursScrollRef.current.scrollTop = top;
    } else {
      if (dayScrollRef.current) dayScrollRef.current.scrollTop = top;
    }
  }, [hourHeightPx, viewMode]);

  useEffect(() => {
    // Deixa o horário atual em foco ao abrir/trocar visão.
    // rAF garante que o container já tenha layout/altura.
    const id = requestAnimationFrame(scrollToNow);
    return () => cancelAnimationFrame(id);
  }, [scrollToNow]);

  const handleVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (hoursScrollRef.current && e.currentTarget !== hoursScrollRef.current) {
      hoursScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    if (contentScrollRef.current && e.currentTarget !== contentScrollRef.current) {
      contentScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const detectConflictsForDayKey = useCallback(
    (dayKey: string): number[] => {
      const dayEvents = events.filter((e) => placement(e).dayKey === dayKey);
      const conflicts: number[] = [];

      dayEvents.forEach((event1) => {
        dayEvents.forEach((event2) => {
          if (event1.id !== event2.id) {
            const p1 = placement(event1);
            const p2 = placement(event2);
            const event1End = p1.startHour + p1.duration;
            const event2End = p2.startHour + p2.duration;

            if (
              (p1.startHour < event2End && event1End > p2.startHour) ||
              (p2.startHour < event1End && event2End > p1.startHour)
            ) {
              conflicts.push(Math.floor(p1.startHour));
              conflicts.push(Math.floor(p2.startHour));
            }
          }
        });
      });

      return [...new Set(conflicts)];
    },
    [events],
  );

  const handleDrop = async (eventId: string, newDayKey: string, newHour: number) => {
    if (selectedFriendId) {
      setSyncError('Eventos da agenda de amigos não podem ser movidos por aqui.');
      return;
    }
    const snapped = snapQuarterHour(newHour);
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const moved = moveEventToSlot(ev, newDayKey, snapped);
    try {
      setActionLoading(true);
      const updated = await patchCalendarEvent(eventId, {
        startsAt: moved.startsAt,
        endsAt: moved.endsAt,
      });
      setEvents((prev) => mergeEventsById(prev, [updated]));
      const hasConflicts = detectConflictsForDayKey(newDayKey).length > 0;
      setShowConflictWarning(hasConflicts);
      if (viewMode === 'day') {
        const [y, m, d] = newDayKey.split('-').map(Number);
        setAnchorDate(new Date(y, m - 1, d));
      }
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      else setSyncError(e instanceof Error ? e.message : 'Erro ao mover evento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDropKeepTime = (eventId: string, newDayKey: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    void handleDrop(eventId, newDayKey, snapQuarterHour(placement(ev).startHour));
  };

  const openDraftFromEvent = (event: CalendarEvent) => {
    const p = placement(event);
    const guestNames = event.guests ?? [];
    const matchedGuestFriendIds = friends
      .filter((friend) => guestNames.some((guest) => guest.toLowerCase() === friend.name.toLowerCase()))
      .map((friend) => friend.friendUserId);
    setEventDropdown(null);
    setGuestSearch('');
    setShowGuestPicker(false);
    setEditingEvent({
      id: event.id,
      title: event.title,
      dateKey: p.dayKey,
      startHour: snapQuarterHour(p.startHour),
      duration: nearestDuration(p.duration),
      type: event.type,
      guests: [...guestNames],
      guestFriendIds: matchedGuestFriendIds,
      description: event.description ?? '',
      color: event.color ?? PASTEL_COLORS[0].value,
    });
    setIsCreatingNew(false);
  };

  const handleSlotClick = (dayKey: string, hour: number) => {
    setEventDropdown(null);
    setGuestSearch('');
    setShowGuestPicker(false);
    setEditingEvent({
      id: '',
      title: '',
      dateKey: dayKey,
      startHour: hour,
      duration: 1,
      type: 'task',
      guests: [],
      guestFriendIds: [],
      description: '',
      color: PASTEL_COLORS[0].value,
    });
    setIsCreatingNew(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (selectedFriendId) {
      setSyncError('Para alterar a agenda de um amigo, crie uma nova solicitação.');
      return;
    }
    openDraftFromEvent(event);
  };

  const handleSaveEvent = async () => {
    if (!editingEvent || !editingEvent.title.trim()) return;

    const { startsAt, endsAt } = buildIsoRange(
      editingEvent.dateKey,
      editingEvent.startHour,
      editingEvent.duration,
    );
    const selectedGuestIds = new Set(editingEvent.guestFriendIds);
    const guestFriendsForSave = friends.filter((friend) => selectedGuestIds.has(friend.friendUserId));
    const guestsPayload = guestFriendsForSave.map((friend) => ({ name: friend.name, email: friend.email }));

    try {
      setActionLoading(true);
      setSyncError(null);
      if (isCreatingNew) {
        const payload = {
          title: editingEvent.title.trim(),
          startsAt,
          endsAt,
          eventType: editingEvent.type,
          color: editingEvent.color,
          description: editingEvent.description.trim() || null,
          guests: guestsPayload,
        };
        const guestCalendarTargets = guestFriendsForSave.filter(
          (friend) => friend.friendUserId !== selectedFriendId,
        );
        let directGuestCreates = 0;
        let requestedGuestCreates = 0;
        let failedGuestCreates = 0;

        if (selectedFriendId) {
          const result = await createFriendCalendarEventRequest(selectedFriendId, payload);
          if (result.event) setEvents((prev) => mergeEventsById(prev, [result.event as CalendarEvent]));
          setSyncError(
            result.mode === 'requested'
              ? 'Pedido enviado para aprovação do amigo.'
              : 'Evento criado na agenda do amigo.',
          );
        } else {
          const created = await createCalendarEvent(payload);
          setEvents((prev) => mergeEventsById(prev, [created]));
        }

        for (const friend of guestCalendarTargets) {
          try {
            const result = await createFriendCalendarEventRequest(friend.friendUserId, payload);
            if (result.mode === 'requested') requestedGuestCreates += 1;
            else directGuestCreates += 1;
          } catch (e) {
            if (e instanceof AuthSessionExpiredError) throw e;
            failedGuestCreates += 1;
          }
        }

        if (guestCalendarTargets.length > 0) {
          const parts = [];
          if (directGuestCreates > 0) {
            parts.push(`${directGuestCreates} agenda${directGuestCreates > 1 ? 's' : ''} atualizada${directGuestCreates > 1 ? 's' : ''}`);
          }
          if (requestedGuestCreates > 0) {
            parts.push(`${requestedGuestCreates} pedido${requestedGuestCreates > 1 ? 's' : ''} enviado${requestedGuestCreates > 1 ? 's' : ''}`);
          }
          if (failedGuestCreates > 0) {
            parts.push(`${failedGuestCreates} convite${failedGuestCreates > 1 ? 's' : ''} não salvo${failedGuestCreates > 1 ? 's' : ''}`);
          }
          if (parts.length > 0) setSyncError(`Convidados: ${parts.join(', ')}.`);
        }
      } else {
        const updated = await patchCalendarEvent(editingEvent.id, {
          title: editingEvent.title.trim(),
          startsAt,
          endsAt,
          eventType: editingEvent.type,
          color: editingEvent.color,
          description: editingEvent.description.trim() || null,
          guests: guestsPayload,
        });
        setEvents((prev) => mergeEventsById(prev, [updated]));
      }

      setEditingEvent(null);
      setIsCreatingNew(false);
      setEventDropdown(null);
      setGuestSearch('');
      setShowGuestPicker(false);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      else setSyncError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent || isCreatingNew || !editingEvent.id) return;

    try {
      setActionLoading(true);
      await deleteCalendarEvent(editingEvent.id);
      setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id));
      setEditingEvent(null);
      setIsCreatingNew(false);
      setEventDropdown(null);
      setGuestSearch('');
      setShowGuestPicker(false);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      else setSyncError(e instanceof Error ? e.message : 'Erro ao excluir.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingEvent(null);
    setIsCreatingNew(false);
    setEventDropdown(null);
    setGuestSearch('');
    setShowGuestPicker(false);
  };

  const handleEventResize = async (id: string, newDuration: number) => {
    if (selectedFriendId) {
      setSyncError('Eventos da agenda de amigos não podem ser redimensionados por aqui.');
      return;
    }
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const snapped = Math.max(QUARTER_STEP, Math.round(newDuration * 4) / 4);
    const resized = resizeEventDuration(ev, snapped);
    try {
      const updated = await patchCalendarEvent(id, {
        startsAt: resized.startsAt,
        endsAt: resized.endsAt,
      });
      setEvents((prev) => mergeEventsById(prev, [updated]));
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      else setSyncError(e instanceof Error ? e.message : 'Erro ao redimensionar.');
    }
  };

  const monthCells = useMemo(() => monthGridCells(startOfDay(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))), [anchorDate]);
  const dayViewKey = dayKeyFromDate(startOfDay(anchorDate));
  const dayViewWeekStrip = useMemo(() => weekColumns(weekStartForDate(anchorDate)), [anchorDate]);

  const shift = (dir: -1 | 1) => setAnchorDate((d) => shiftAnchor(d, viewMode, dir));

  const selectedGuestFriends = useMemo(() => {
    const selectedIds = new Set(editingEvent?.guestFriendIds ?? []);
    return friends.filter((friend) => selectedIds.has(friend.friendUserId));
  }, [editingEvent?.guestFriendIds, friends]);

  const guestFriendCandidates = useMemo(() => {
    const selectedIds = new Set(editingEvent?.guestFriendIds ?? []);
    const query = guestSearch.trim().toLowerCase();
    return friends
      .filter((friend) => friend.friendUserId !== selectedFriendId)
      .filter((friend) => friend.canCreateCalendarEventsDirect || friend.canRequestCalendarEvents)
      .filter((friend) => !selectedIds.has(friend.friendUserId))
      .filter((friend) => {
        if (!query) return true;
        return [friend.name, friend.nickname, friend.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      });
  }, [editingEvent?.guestFriendIds, friends, guestSearch, selectedFriendId]);

  const handleCalendarSwipeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button,input,textarea,select,a,.event-card-apple,[role="button"]')) return;

    calendarSwipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCalendarSwipeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = calendarSwipeRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    calendarSwipeRef.current = null;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaX) < 80 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return;

    suppressSwipeClickRef.current = true;
    shift(deltaX < 0 ? 1 : -1);
  };

  const handleCalendarSwipeCancel = () => {
    calendarSwipeRef.current = null;
  };

  const handleCalendarClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressSwipeClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressSwipeClickRef.current = false;
  };

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
          <div className="px-5 pt-6 pb-3 border-b border-border bg-background">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={onOpenMenu}
                className="w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              <h1 className="text-base font-medium text-muted-foreground">Kiki</h1>
              <AppNotificationsBell onNavigateToAll={onNavigateToNotifications} />
            </div>

            <div className="mb-4 flex items-center justify-end gap-2">
              <div className="relative" ref={viewMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowViewMenu(!showViewMenu)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md transition-all hover:shadow-lg btn-apple-gradient"
                  aria-label="Trocar visualização"
                >
                  <AlignJustify className="h-5 w-5" />
                </button>

                {showViewMenu && (
                  <div className="absolute right-0 top-[calc(100%+0.375rem)] z-[220] min-w-36 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                    {(['day', 'week', 'month'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setViewMode(mode);
                          setShowViewMenu(false);
                        }}
                        className={`w-full px-3 py-1.5 text-xs text-left hover:bg-muted btn-apple ${
                          viewMode === mode ? 'bg-purple-500/10 text-purple-500' : ''
                        }`}
                      >
                        {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={agendaMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAgendaMenu((prev) => !prev)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md transition-all hover:shadow-lg btn-apple-gradient"
                  aria-label="Selecionar agenda"
                >
                  <Users className="h-5 w-5" />
                </button>

                  {showAgendaMenu ? (
                    <div className="absolute right-0 top-[calc(100%+0.375rem)] z-[220] min-w-56 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFriendId('');
                          setSyncError(null);
                          setShowAgendaMenu(false);
                        }}
                        className={`btn-apple flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/45 ${
                          !selectedFriendId ? 'text-purple-600' : 'text-foreground'
                        }`}
                      >
                        <span>Minha agenda</span>
                        {!selectedFriendId ? <Check className="w-4 h-4" /> : null}
                      </button>

                      {visibleCalendarFriends.length > 0 ? (
                        visibleCalendarFriends.map((friend) => (
                          <button
                            key={friend.friendUserId}
                            type="button"
                            onClick={() => {
                              setSelectedFriendId(friend.friendUserId);
                              setSyncError(null);
                              setShowAgendaMenu(false);
                            }}
                            className={`btn-apple flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/45 ${
                              selectedFriendId === friend.friendUserId ? 'text-purple-600' : 'text-foreground'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate">Agenda de {friend.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">@{friend.nickname}</span>
                            </span>
                            {selectedFriendId === friend.friendUserId ? <Check className="w-4 h-4 shrink-0" /> : null}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">
                          Nenhuma agenda de amigo disponível.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

              <button
                type="button"
                onClick={() => {
                  const dk = defaultNewDayKey();
                  setEventDropdown(null);
                  setGuestSearch('');
                  setShowGuestPicker(false);
                  setEditingEvent({
                    id: '',
                    title: '',
                    dateKey: dk,
                    startHour: 9,
                    duration: 1,
                    type: 'task',
                    guests: [],
                    guestFriendIds: [],
                    description: '',
                    color: PASTEL_COLORS[0].value,
                  });
                  setIsCreatingNew(true);
                }}
                disabled={actionLoading}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md transition-all hover:shadow-lg btn-apple-gradient disabled:opacity-50"
                aria-label="Criar evento"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {selectedFriend ? (
              <p className="mb-3 text-[11px] text-muted-foreground">
                {selectedFriend.canCreateCalendarEventsDirect
                  ? 'Você pode criar eventos diretamente nesta agenda.'
                  : 'Novos eventos serão enviados para aprovação.'}
              </p>
            ) : null}

            {(syncLoading || syncError) && (
              <div className="mt-2 text-xs text-muted-foreground">
                {syncLoading && <p>A sincronizar com o servidor…</p>}
                {syncError && <p className="text-red-500">{syncError}</p>}
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
                      Detectei um <span className="font-medium">conflito de horário</span>. Ajuste um dos eventos ou
                      arraste para outro horário.
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
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

          <div
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
            onPointerDown={handleCalendarSwipeStart}
            onPointerUp={handleCalendarSwipeEnd}
            onPointerCancel={handleCalendarSwipeCancel}
            onClickCapture={handleCalendarClickCapture}
          >
          {viewMode === 'week' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-10 flex-shrink-0 bg-background z-30">
                <div className="flex h-[42px] items-center justify-center">
                  <button
                    type="button"
                    onClick={() => shift(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-purple-500/40 hover:text-purple-600 btn-apple"
                    aria-label="Semana anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
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
                        style={{ height: `${hourHeightPx}px` }}
                      >
                        <span className="text-[10px] text-muted-foreground bg-background px-1 -mt-2.5">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="relative flex flex-shrink-0 bg-background" style={{ height: '42px' }}>
                  <div className="flex flex-1 min-w-0">
                    {weekDayCols.map((item) => {
                      const isToday = item.dayKey === todayKey;
                      return (
                        <CalendarHeaderDayDrop
                          key={item.dayKey}
                          dayKey={item.dayKey}
                          onDropKeepTime={handleDropKeepTime}
                          className="flex-1 min-w-0"
                        >
                          <div className={`text-center py-1.5 rounded-xl m-0.5 ${isToday ? 'text-purple-600' : ''}`}>
                            <p className="text-[10px] opacity-70 capitalize">{item.weekdayShort}</p>
                            <p className="text-xs font-medium">{format(item.date, 'd')}</p>
                            {isToday ? <span className="mx-auto mt-0.5 block h-1 w-1 rounded-full bg-purple-500" /> : null}
                          </div>
                        </CalendarHeaderDayDrop>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => shift(1)}
                    className="absolute right-1 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-sm transition-colors hover:border-purple-500/40 hover:text-purple-600 btn-apple"
                    aria-label="Próxima semana"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div
                  ref={contentScrollRef}
                  className="flex-1 overflow-y-auto scrollbar-hide"
                  onScroll={handleVerticalScroll}
                >
                  <div className="flex pt-1.5 h-full">
                    {weekDayCols.map((item) => (
                      <div key={item.dayKey} className="flex-1 min-w-0">
                        <DayColumn
                          dayKey={item.dayKey}
                          events={events}
                          hourHeight={hourHeightPx}
                          onDrop={handleDrop}
                          conflicts={detectConflictsForDayKey(item.dayKey)}
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
              <div className="flex-shrink-0 bg-background z-40">
                <div className="flex" style={{ height: '42px' }}>
                  <div className="w-10 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => shift(-1)}
                      className="mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-purple-500/40 hover:text-purple-600 btn-apple"
                      aria-label="Dia anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative flex-1 min-w-0">
                    <div className="flex px-1 gap-0.5 min-w-0">
                      {dayViewWeekStrip.map((item) => {
                        const isSelected = item.dayKey === dayViewKey;
                        const isToday = item.dayKey === todayKey;
                        return (
                          <CalendarHeaderDayDrop
                            key={item.dayKey}
                            dayKey={item.dayKey}
                            onDropKeepTime={handleDropKeepTime}
                            className="flex-1 min-w-0"
                          >
                            <button
                              type="button"
                              onClick={() => setAnchorDate(startOfDay(item.date))}
                              className={`w-full text-center py-1 rounded-lg m-0.5 btn-apple transition-colors ${
                                isSelected
                                  ? 'text-purple-600'
                                  : isToday
                                    ? 'text-purple-500'
                                    : 'hover:bg-muted/70 text-foreground'
                              }`}
                            >
                              <p className="text-[9px] opacity-80 capitalize leading-tight truncate">{item.weekdayShort}</p>
                              <p className="text-[11px] font-semibold leading-tight">{format(item.date, 'd')}</p>
                              {isSelected ? <span className="mx-auto mt-0.5 block h-1 w-1 rounded-full bg-purple-500" /> : null}
                            </button>
                          </CalendarHeaderDayDrop>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => shift(1)}
                      className="absolute right-1 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-sm transition-colors hover:border-purple-500/40 hover:text-purple-600 btn-apple"
                      aria-label="Próximo dia"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div ref={dayScrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="flex">
                  <div className="w-10 flex-shrink-0 bg-background">
                    <div className="relative pt-1.5">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="relative flex items-start justify-center"
                          style={{ height: `${hourHeightPx}px` }}
                        >
                          <span className="text-[9px] text-muted-foreground bg-background px-0.5 -mt-2">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 px-3">
                    <DayColumn
                      dayKey={dayViewKey}
                      events={events}
                      hourHeight={hourHeightPx}
                      onDrop={handleDrop}
                      conflicts={detectConflictsForDayKey(dayViewKey)}
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
                  {monthCells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`pad-${idx}`} className="aspect-square" />;
                    }
                    const { date } = cell;
                    const dayEvents = eventsForDay(events, date);
                    const isToday = isSameDay(date, new Date());
                    return (
                      <MonthDayDroppable
                        key={dayKeyFromDate(date)}
                        date={date}
                        isToday={isToday}
                        onDropKeepTime={handleDropKeepTime}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? '' : ''}`}>{format(date, 'd')}</div>
                        {dayEvents.length > 0 && (
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <MonthEventChip key={event.id} event={event} onOpen={() => openDraftFromEvent(event)} />
                            ))}
                            {dayEvents.length > 2 && (
                              <div className={`text-[8px] ${isToday ? 'text-purple-500/80' : 'text-muted-foreground'}`}>
                                +{dayEvents.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                      </MonthDayDroppable>
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
                  {Array.from({ length: 12 }, (_, monthIndex) => {
                    const monthMini = new Date(anchorDate.getFullYear(), monthIndex, 1);
                    const miniCells = monthGridCells(monthMini);
                    const monthEvents = eventsTouchingMonth(events, monthMini);
                    return (
                      <button
                        key={monthIndex}
                        type="button"
                        onClick={() => {
                          setAnchorDate(startOfDay(new Date(anchorDate.getFullYear(), monthIndex, 1)));
                          setViewMode('month');
                        }}
                        className="border border-border rounded-xl p-3 w-full text-left hover:bg-muted/50 transition-colors btn-apple focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
                      >
                        <h4 className="mb-2 text-center text-sm capitalize">{format(monthMini, 'MMM', { locale: ptBR })}</h4>
                        <div className="grid grid-cols-7 gap-1">
                          {miniCells.map((c, i) => {
                            if (!c) return <div key={`e-${monthIndex}-${i}`} className="aspect-square" />;
                            const hasEvent = monthEvents.some((ev) => isSameDay(parseISO(ev.startsAt), c.date));
                            return (
                              <div
                                key={`${monthIndex}-${c.date.getDate()}`}
                                className={`aspect-square rounded text-[8px] flex items-center justify-center ${
                                  hasEvent ? 'bg-purple-500 text-white' : 'hover:bg-muted'
                                }`}
                              >
                                {c.date.getDate()}
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </div>

          {editingEvent && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-3">
              <div className="bg-background rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl">
                <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
                  <h2 className="text-lg">{isCreatingNew ? 'Novo Compromisso' : 'Editar Evento'}</h2>
                  <button
                    type="button"
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
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-background border border-border focus:border-purple-500 focus:outline-none input-apple"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-1.5 text-muted-foreground">Dia</label>
                      <input
                        type="date"
                        value={editingEvent.dateKey}
                        onChange={(e) => setEditingEvent({ ...editingEvent, dateKey: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-background border border-border focus:border-purple-500 focus:outline-none input-apple"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3" ref={eventDropdownRef}>
                      <div>
                        <label className="block text-xs mb-1.5 text-muted-foreground">Hora início</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setEventDropdown((current) => (current === 'start' ? null : 'start'))}
                            className="btn-apple flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm hover:bg-muted/30"
                          >
                            <span>{formatHourOptionLabel(editingEvent.startHour)}</span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${eventDropdown === 'start' ? 'rotate-180' : ''}`} />
                          </button>

                          {eventDropdown === 'start' ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[230] max-h-56 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                              {START_HOUR_OPTIONS.map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => {
                                    setEditingEvent({ ...editingEvent, startHour: h });
                                    setEventDropdown(null);
                                  }}
                                  className={`btn-apple flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/45 ${
                                    editingEvent.startHour === h ? 'text-purple-600' : 'text-foreground'
                                  }`}
                                >
                                  <span>{formatHourOptionLabel(h)}</span>
                                  {editingEvent.startHour === h ? <Check className="h-4 w-4" /> : null}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs mb-1.5 text-muted-foreground">Duração</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setEventDropdown((current) => (current === 'duration' ? null : 'duration'))}
                            className="btn-apple flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm hover:bg-muted/30"
                          >
                            <span>{formatDurationLabel(editingEvent.duration)}</span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${eventDropdown === 'duration' ? 'rotate-180' : ''}`} />
                          </button>

                          {eventDropdown === 'duration' ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[230] max-h-56 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                              {DURATION_OPTIONS.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => {
                                    setEditingEvent({ ...editingEvent, duration: d });
                                    setEventDropdown(null);
                                  }}
                                  className={`btn-apple flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/45 ${
                                    editingEvent.duration === d ? 'text-purple-600' : 'text-foreground'
                                  }`}
                                >
                                  <span>{formatDurationLabel(d)}</span>
                                  {editingEvent.duration === d ? <Check className="h-4 w-4" /> : null}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs mb-1.5 text-muted-foreground">Tipo</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['meeting', 'task', 'personal'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
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
                      <div className="flex gap-2 flex-wrap">
                        {PASTEL_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
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
                      <div className="relative" ref={guestPickerRef}>
                        <input
                          type="text"
                          value={guestSearch}
                          onChange={(e) => {
                            setGuestSearch(e.target.value);
                            setShowGuestPicker(true);
                          }}
                          onFocus={() => setShowGuestPicker(true)}
                          onClick={() => setShowGuestPicker(true)}
                          placeholder="Buscar amigo pelo nome"
                          className="w-full px-3 py-2.5 text-sm rounded-xl bg-background border border-border focus:border-purple-500 focus:outline-none input-apple"
                        />

                        {showGuestPicker ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[230] max-h-56 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                            {guestFriendCandidates.length > 0 ? (
                              guestFriendCandidates.map((friend) => (
                                <button
                                  key={friend.friendUserId}
                                  type="button"
                                  onClick={() => {
                                    const nextIds = [...editingEvent.guestFriendIds, friend.friendUserId];
                                    const nextNames = friends
                                      .filter((item) => nextIds.includes(item.friendUserId))
                                      .map((item) => item.name);
                                    setEditingEvent({
                                      ...editingEvent,
                                      guestFriendIds: nextIds,
                                      guests: nextNames,
                                    });
                                    setGuestSearch('');
                                    setShowGuestPicker(false);
                                  }}
                                  className="btn-apple flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/45"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate">{friend.name}</span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                      @{friend.nickname}
                                    </span>
                                  </span>
                                  <span className="shrink-0 text-[10px] text-purple-600">
                                    {friend.canCreateCalendarEventsDirect ? 'Salva direto' : 'Envia pedido'}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2.5 text-xs text-muted-foreground">
                                Nenhum amigo disponível.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {selectedGuestFriends.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedGuestFriends.map((friend) => (
                            <span
                              key={friend.friendUserId}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                            >
                              <span className="truncate">{friend.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextIds = editingEvent.guestFriendIds.filter(
                                    (id) => id !== friend.friendUserId,
                                  );
                                  const nextNames = friends
                                    .filter((item) => nextIds.includes(item.friendUserId))
                                    .map((item) => item.name);
                                  setEditingEvent({
                                    ...editingEvent,
                                    guestFriendIds: nextIds,
                                    guests: nextNames,
                                  });
                                }}
                                className="text-muted-foreground hover:text-purple-600"
                                aria-label={`Remover ${friend.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-xs mb-1.5 text-muted-foreground">Descrição</label>
                      <textarea
                        value={editingEvent.description}
                        onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-background border border-border focus:border-purple-500 focus:outline-none input-apple resize-none"
                        placeholder="Adicione detalhes..."
                      />
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-background border-t border-border px-5 py-3 flex gap-2">
                  {!isCreatingNew && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteEvent()}
                      disabled={actionLoading}
                      className="px-4 py-2.5 text-sm rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 btn-apple disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={actionLoading}
                    className={`px-4 py-2.5 text-sm rounded-xl bg-muted hover:bg-muted/80 btn-apple ${isCreatingNew ? '' : 'flex-1'} disabled:opacity-50`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveEvent()}
                    disabled={!editingEvent.title.trim() || actionLoading}
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

      {(viewMode === 'week' || viewMode === 'day') && !editingEvent && (
        <div className="fixed bottom-6 left-5 z-40 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 flex-nowrap">
            <button
              type="button"
              onClick={() => setHourHeightPx((h) => Math.max(MIN_HOUR_HEIGHT, h - HOUR_HEIGHT_ZOOM_STEP))}
              disabled={hourHeightPx <= MIN_HOUR_HEIGHT}
              title="Diminuir zoom"
              className="w-12 h-12 shrink-0 rounded-full bg-card border border-border hover:bg-muted flex items-center justify-center btn-apple disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              <ZoomOut className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setHourHeightPx((h) => Math.min(MAX_HOUR_HEIGHT, h + HOUR_HEIGHT_ZOOM_STEP))}
              disabled={hourHeightPx >= MAX_HOUR_HEIGHT}
              title="Aumentar zoom"
              className="w-12 h-12 shrink-0 rounded-full bg-card border border-border hover:bg-muted flex items-center justify-center btn-apple disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              <ZoomIn className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      <VoiceChatOrb />
    </>
  );
}
