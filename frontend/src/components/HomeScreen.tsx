import { motion, useReducedMotion } from "framer-motion";
import { Calendar, CheckCircle2, Clock, Sparkles, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { AnimatedIcon } from "@/components/motion/AnimatedIcon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { motionDurations, motionEasings } from "@/lib/motion";

interface HomeScreenProps {
  onNavigateToChat?: () => void;
}

export function HomeScreen({ onNavigateToChat }: HomeScreenProps) {
  const reduceMotion = useReducedMotion();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';

  const upcomingTasks = useMemo(
    () => [
      {
        id: 1,
        title: "Reunião com equipe",
        time: "10:00",
        type: "meeting",
        description: "Alinhar prioridades da semana, bloqueios e próximos passos do projeto.",
        people: ["Maria", "João", "Ana", "Pedro"],
        deadline: "Hoje, 10:00",
      },
      {
        id: 2,
        title: "Revisar relatório",
        time: "14:30",
        type: "task",
        description: "Revisar o relatório de desempenho e ajustar pontos críticos antes do envio.",
        people: ["Maria", "Equipe Ops"],
        deadline: "Hoje, 18:00",
      },
      {
        id: 3,
        title: "Call com cliente",
        time: "16:00",
        type: "meeting",
        description: "Apresentar status, validar expectativas e alinhar entregáveis da sprint.",
        people: ["Maria", "Cliente", "CS"],
        deadline: "Hoje, 16:00",
      },
    ],
    [],
  );

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const selectedTask = useMemo(
    () => upcomingTasks.find((t) => t.id === selectedTaskId) ?? null,
    [selectedTaskId, upcomingTasks],
  );

  const onInteractiveCardKeyDown = useCallback(
    (e: React.KeyboardEvent, id: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedTaskId(id);
      }
    },
    [],
  );

  const todayStats = {
    completed: 5,
    total: 8,
    productivity: 65,
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl mb-2">{greeting}, Maria</h1>
            <p className="text-muted-foreground">Segunda-feira, 28 de Abril</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <span className="text-white">M</span>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 mb-6 text-white border-0 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <AnimatedIcon hover="twist">
              <Sparkles className="w-5 h-5" />
            </AnimatedIcon>
            <span className="opacity-90">Assistente KIKI</span>
          </div>
          <p className="mb-4 text-lg leading-relaxed">
            Você tem 3 compromissos hoje e 3 tarefas pendentes. Quer que eu organize seu dia?
          </p>
          <Button
            onClick={onNavigateToChat}
            variant="secondary"
            className="bg-white/95 text-purple-700 hover:bg-white shadow-sm rounded-full px-6"
          >
            Conversar com Kiki
          </Button>
        </Card>

        <div className="mb-6">
          <h2 className="mb-4">Produtividade de hoje</h2>
          <Card interactive className="rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">Tarefas concluídas</span>
              <span className="text-lg">{todayStats.completed}/{todayStats.total}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 mb-3">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full will-change-transform"
                initial={reduceMotion ? false : { width: 0 }}
                animate={reduceMotion ? undefined : { width: `${todayStats.productivity}%` }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: motionDurations.lg, ease: motionEasings.out }
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {todayStats.productivity}% de produtividade
            </p>
          </Card>
        </div>

        <div>
          <h2 className="mb-4">Próximas atividades</h2>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <Card
                key={task.id}
                interactive
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTaskId(task.id)}
                onKeyDown={(e) => onInteractiveCardKeyDown(e, task.id)}
                className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  task.type === 'meeting' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  <AnimatedIcon>
                    {task.type === "meeting" ? (
                      <Calendar className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </AnimatedIcon>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">{task.title}</h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{task.time}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {selectedTask && (
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-white">
                      {selectedTask.title}
                    </DialogTitle>
                    <DialogDescription className="text-white/85 mt-1 leading-relaxed">
                      {selectedTask.description}
                    </DialogDescription>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-white/15 border border-white/20 px-3 py-1 text-xs">
                    {selectedTask.time}
                  </div>
                </div>
              </div>

              <div className="p-5 grid gap-4">
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prazo</span>
                    <span className="text-sm font-medium">{selectedTask.deadline}</span>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="size-4" />
                      <span>Pessoas envolvidas</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedTask.people.length} pessoas
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedTask.people.map((p) => (
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
