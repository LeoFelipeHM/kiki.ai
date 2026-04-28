import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { AnimatedIcon } from "@/components/motion/AnimatedIcon";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { motionEasings } from "@/lib/motion";
import { Button } from "@/components/ui/button";

export function CalendarScreen() {
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week');
  const reduceMotion = useReducedMotion();

  const events = useMemo(
    () => [
      {
        id: 1,
        title: "Reunião com equipe",
        time: "10:00 - 11:00",
        color: "bg-blue-500",
        day: 28,
        description: "Revisão de entregas, alinhamento de prioridades e plano de ação do dia.",
        people: ["Maria", "João", "Ana", "Pedro"],
        deadline: "28 Abr, 10:00",
      },
      {
        id: 2,
        title: "Call com cliente",
        time: "14:30 - 15:30",
        color: "bg-purple-500",
        day: 28,
        description: "Atualizar status do projeto, validar escopo e próximos checkpoints.",
        people: ["Maria", "Cliente", "CS"],
        deadline: "28 Abr, 14:30",
      },
      {
        id: 3,
        title: "Apresentação projeto",
        time: "16:00 - 17:00",
        color: "bg-pink-500",
        day: 29,
        description: "Apresentação do progresso e demonstração do que foi entregue na sprint.",
        people: ["Maria", "Time Produto", "Stakeholders"],
        deadline: "29 Abr, 16:00",
      },
      {
        id: 4,
        title: "Revisão de código",
        time: "09:00 - 10:00",
        color: "bg-green-500",
        day: 30,
        description: "Revisar PRs críticos, padronizar padrões e checar regressões.",
        people: ["Maria", "Dev Team"],
        deadline: "30 Abr, 09:00",
      },
    ],
    [],
  );

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthDays = Array.from({ length: 30 }, (_, i) => i + 1);

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const onInteractiveCardKeyDown = useCallback(
    (e: React.KeyboardEvent, id: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedEventId(id);
      }
    },
    [],
  );

  return (
    <div className="flex-1 flex flex-col pb-20">
      <div className="px-6 pt-8 pb-4 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-4">
          <h1>Calendário</h1>
          <button className="group w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 transition-[transform,box-shadow] duration-200 ease-out active:scale-[0.98] hover:shadow-md">
            <AnimatedIcon>
              <Plus className="w-6 h-6" />
            </AnimatedIcon>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button className="group w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 transition-[transform,background-color] duration-200 ease-out active:scale-[0.98]">
            <AnimatedIcon>
              <ChevronLeft className="w-5 h-5" />
            </AnimatedIcon>
          </button>
          <h3>Abril 2026</h3>
          <button className="group w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 transition-[transform,background-color] duration-200 ease-out active:scale-[0.98]">
            <AnimatedIcon>
              <ChevronRight className="w-5 h-5" />
            </AnimatedIcon>
          </button>
        </div>

        <div className="relative flex gap-2 bg-muted rounded-full p-1">
          {(['day', 'week', 'month'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className="relative flex-1 py-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 transition-[color] duration-200"
            >
              {currentView === view && (
                <motion.div
                  layoutId="calendarViewPill"
                  className="absolute inset-0 rounded-full bg-background shadow-sm"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 42 }
                  }
                />
              )}
              <span className="relative z-10">
                {view === "day" ? "Dia" : view === "week" ? "Semana" : "Mês"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait" initial={false}>
          {currentView === "week" && (
            <motion.div
              key="week"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: motionEasings.out }}
            >
              <div className="grid grid-cols-7 gap-2 mb-6">
                {weekDays.map((day, index) => {
                  const dayNumber = 26 + index;
                  const isToday = dayNumber === 28;
                  return (
                    <div key={day} className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">{day}</p>
                      <button
                        className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 transition-[transform,background-color] duration-200 ease-out active:scale-[0.98] ${
                          isToday
                            ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm"
                            : "hover:bg-muted"
                        }`}
                      >
                        {dayNumber}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <h3>Eventos da semana</h3>
                {events.map((event) => (
                  <Card
                    key={event.id}
                    interactive
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEventId(event.id)}
                    onKeyDown={(e) => onInteractiveCardKeyDown(e, event.id)}
                    className="rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
                  >
                    <div className={`w-1 h-full ${event.color} rounded-full`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4>{event.title}</h4>
                        <span className="text-sm text-muted-foreground">{event.day} Abr</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.time}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {currentView === "month" && (
            <motion.div
              key="month"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: motionEasings.out }}
            >
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground mb-2">
                    {day}
                  </div>
                ))}
                {monthDays.map((day) => {
                  const hasEvent = events.some((e) => e.day === day);
                  const isToday = day === 28;
                  return (
                    <button
                      key={day}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center relative outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 transition-[transform,background-color] duration-200 ease-out active:scale-[0.98] ${
                        isToday
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm"
                          : hasEvent
                            ? "bg-muted hover:bg-muted/70"
                            : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-sm">{day}</span>
                      {hasEvent && !isToday && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {currentView === "day" && (
            <motion.div
              key="day"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: motionEasings.out }}
              className="space-y-4"
            >
              <Card interactive className="rounded-2xl p-4">
                <h3 className="mb-2">Segunda-feira, 28 de Abril</h3>
                <p className="text-muted-foreground">2 eventos agendados</p>
              </Card>

              <div className="space-y-3">
                {events
                  .filter((e) => e.day === 28)
                  .map((event) => (
                    <Card
                      key={event.id}
                      interactive
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedEventId(event.id)}
                      onKeyDown={(e) => onInteractiveCardKeyDown(e, event.id)}
                      className="rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
                    >
                      <div className={`w-2 h-full ${event.color} rounded-full`} />
                      <div className="flex-1">
                        <h4 className="mb-1">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.time}</p>
                      </div>
                    </Card>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {selectedEvent && (
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-white">
                      {selectedEvent.title}
                    </DialogTitle>
                    <DialogDescription className="text-white/85 mt-1 leading-relaxed">
                      {selectedEvent.description}
                    </DialogDescription>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-white/15 border border-white/20 px-3 py-1 text-xs">
                    {selectedEvent.time}
                  </div>
                </div>
              </div>

              <div className="p-5 grid gap-4">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prazo</span>
                    <span className="text-sm font-medium">{selectedEvent.deadline}</span>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="size-4" />
                      <span>Pessoas envolvidas</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedEvent.people.length} pessoas
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.people.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm"
                      >
                        <span className="size-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-[10px] font-semibold">
                          {p.trim().slice(0, 1).toUpperCase()}
                        </span>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="rounded-full px-5">Ok, entendi</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
