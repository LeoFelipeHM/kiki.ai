import {
  Bot,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Loader2,
  Menu,
  Pause,
  Plane,
  Play,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { AppNotificationsBell } from '@/components/HomeNotificationsBell';
import { VoiceChatOrb } from '@/components/VoiceChatOrb';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  authorizeAgent,
  createAgent,
  deleteAgent,
  fetchAgents,
  pauseAgent,
  reorderAgents,
  resumeAgent,
} from '@/services/agents';
import type { Agent, AgentEffort, AgentType } from '@/types/agent';

type AgentTypeConfig = {
  id: AgentType;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
};

const AGENT_TYPES: AgentTypeConfig[] = [
  { id: 'research', name: 'Pesquisador', icon: FileSearch, color: 'from-blue-500 to-cyan-500', description: 'Pesquisa e análise de dados' },
  { id: 'shopping', name: 'Compras', icon: ShoppingCart, color: 'from-purple-500 to-pink-500', description: 'Comparar preços e produtos' },
  { id: 'travel', name: 'Viagens', icon: Plane, color: 'from-orange-500 to-yellow-500', description: 'Passagens, rotas e hotéis' },
  { id: 'custom', name: 'Personalizado', icon: Bot, color: 'from-green-500 to-emerald-500', description: 'Tarefa customizada' },
];

const EFFORTS: { id: AgentEffort; label: string; description: string }[] = [
  { id: 'low', label: 'Baixo', description: 'Pouco pensamento' },
  { id: 'medium', label: 'Médio', description: 'Equilibrado' },
  { id: 'high', label: 'Muito', description: 'Mais validações' },
];

function iconForType(type: AgentType) {
  return AGENT_TYPES.find((item) => item.id === type)?.icon ?? Bot;
}

function progressForDisplay(agent: Agent) {
  return agent.status === 'completed' ? 100 : Math.min(agent.progress, 99);
}

export function AgentsScreen({
  onOpenMenu,
  onNavigateToNotifications,
  onNavigateToHome,
  onNavigateToAgentDetail,
  onSessionExpired,
  userName = 'Maria Silva',
}: {
  onOpenMenu?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToHome?: () => void;
  onNavigateToAgentDetail?: (agentId: string) => void;
  onSessionExpired?: () => void;
  userName?: string;
}) {
  const { themeColor } = useTheme();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [task, setTask] = useState('');
  const [selectedType, setSelectedType] = useState<AgentType>('custom');
  const [selectedEffort, setSelectedEffort] = useState<AgentEffort>('medium');
  const [isCreating, setIsCreating] = useState(false);

  const activeAgents = agents.filter((a) => a.status === 'queued' || a.status === 'working').length;
  const completedAgents = agents.filter((a) => a.status === 'completed').length;
  const shouldPoll = agents.some((a) => a.status === 'queued' || a.status === 'working');

  const loadAgents = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const list = await fetchAgents();
      setAgents(list);
      setError(null);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível carregar agentes.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (!shouldPoll) return;
    const id = window.setInterval(() => void loadAgents(true), 2500);
    return () => window.clearInterval(id);
  }, [loadAgents, shouldPoll]);

  const createAgentFromTask = useCallback(async (taskText: string, type: AgentType, effort: AgentEffort) => {
    if (!taskText.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const agent = await createAgent({ task: taskText.trim(), type, effort });
      setAgents((prev) => [agent, ...prev]);
      setTask('');
      setSelectedType('custom');
      setSelectedEffort('medium');
      setShowCreateModal(false);
      onNavigateToAgentDetail?.(agent.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o agente.');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, onNavigateToAgentDetail]);

  const handleCreate = async () => {
    await createAgentFromTask(task, selectedType, selectedEffort);
  };

  const updateAgent = (agent: Agent) => {
    setAgents((prev) => prev.map((item) => (item.id === agent.id ? agent : item)));
  };

  const handleAuthorize = async (agentId: string) => {
    updateAgent(await authorizeAgent(agentId));
  };

  const handlePause = async (agentId: string) => {
    updateAgent(await pauseAgent(agentId));
  };

  const handleResume = async (agentId: string) => {
    updateAgent(await resumeAgent(agentId));
  };

  const handleDelete = async (agentId: string) => {
    if (!window.confirm('Deseja excluir este agente?')) return;
    await deleteAgent(agentId);
    setAgents((prev) => prev.filter((agent) => agent.id !== agentId));
  };

  const moveAgent = async (agentId: string, direction: -1 | 1) => {
    const index = agents.findIndex((agent) => agent.id === agentId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= agents.length) return;
    const next = [...agents];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setAgents(next);
    try {
      setAgents(await reorderAgents(next.map((agent) => agent.id)));
    } catch {
      setAgents(agents);
    }
  };

  const content = (() => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (agents.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${themeColor} opacity-20`}>
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h3 className="mb-2 text-lg font-medium">Nenhum agente ainda</h3>
          <p className="mb-6 text-sm text-muted-foreground">Crie um agente para a Kiki planejar a execução.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`flex items-center gap-2 rounded-full bg-gradient-to-br ${themeColor} px-6 py-3 text-white shadow-lg btn-apple-gradient`}
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Criar Agente</span>
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {agents.map((agent, index) => {
          const Icon = iconForType(agent.type);
          const progress = progressForDisplay(agent);
          return (
            <div
              key={agent.id}
              onClick={() => onNavigateToAgentDetail?.(agent.id)}
              className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-white card-apple transition-shadow hover:shadow-md"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.color}`}>
                    <Icon className="relative z-10 h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{agent.name}</h3>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{agent.task}</p>
                    {agent.currentAction && <p className="mt-1 text-xs font-medium text-blue-600">{agent.currentAction}</p>}
                  </div>
                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    <button disabled={index === 0} onClick={() => void moveAgent(agent.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button disabled={index === agents.length - 1} onClick={() => void moveAgent(agent.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {agent.status !== 'planned' && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full bg-gradient-to-r ${agent.color} transition-all duration-500`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {agent.status === 'planned' || agent.status === 'error' ? (
                    <button onClick={() => void handleAuthorize(agent.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-md btn-apple-gradient">
                      <Play className="h-4 w-4" />
                      Autorizar execução
                    </button>
                  ) : null}
                  {agent.status === 'queued' || agent.status === 'working' ? (
                    <button onClick={() => void handlePause(agent.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-md btn-apple">
                      <Pause className="h-4 w-4" />
                      Pausar
                    </button>
                  ) : null}
                  {agent.status === 'paused' ? (
                    <button onClick={() => void handleResume(agent.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-md btn-apple-gradient">
                      <Play className="h-4 w-4" />
                      Retomar
                    </button>
                  ) : null}
                  <button onClick={() => void handleDelete(agent.id)} className="flex h-10 w-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50 btn-apple">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  })();

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <div className="border-b border-border bg-background px-5 pb-4 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={onOpenMenu} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted/50 btn-apple">
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <button onClick={onNavigateToHome} className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground btn-apple">
              Kiki
            </button>
            <AppNotificationsBell onNavigateToAll={onNavigateToNotifications} />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Agentes Kiki</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activeAgents} executando • {completedAgents} concluídos</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${themeColor} text-white shadow-lg transition-all hover:shadow-xl btn-apple-gradient`}>
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{content}</div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} style={{ animation: 'fadeIn 200ms ease-out' }}>
          <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-background shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ animation: 'scaleIn 200ms ease-out' }}>
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-xl font-bold">Criar Novo Agente</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <label className="mb-3 block text-sm font-semibold text-muted-foreground">Tipo de Agente</label>
              <div className="mb-6 grid grid-cols-2 gap-3">
                {AGENT_TYPES.map((type) => (
                  <button key={type.id} onClick={() => setSelectedType(type.id)} className={`rounded-2xl border-2 p-4 text-left transition-all btn-apple ${selectedType === type.id ? 'border-purple-500 bg-muted' : 'border-border hover:border-purple-500/30'}`}>
                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${type.color} shadow-md`}>
                      <type.icon className="h-6 w-6 text-white" />
                    </div>
                    <p className="mb-1 text-sm font-semibold">{type.name}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>

              <label className="mb-3 block text-sm font-semibold text-muted-foreground">Nível de pensamento</label>
              <div className="mb-6 grid grid-cols-3 gap-2">
                {EFFORTS.map((effort) => (
                  <button key={effort.id} onClick={() => setSelectedEffort(effort.id)} className={`rounded-xl px-3 py-2 text-center btn-apple ${selectedEffort === effort.id ? `bg-gradient-to-br ${themeColor} text-white shadow-md` : 'bg-muted hover:bg-muted/80'}`}>
                    <p className="text-sm font-semibold">{effort.label}</p>
                    <p className={`text-[11px] ${selectedEffort === effort.id ? 'text-white/75' : 'text-muted-foreground'}`}>{effort.description}</p>
                  </button>
                ))}
              </div>

              <label className="mb-2 block text-sm font-semibold text-muted-foreground">Descreva a tarefa</label>
              <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder="Ex: Pesquisar passagens aéreas de SP para Paris em julho com melhor preço..." rows={4} className="w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 text-sm focus:border-purple-500 focus:outline-none input-apple" autoFocus />
            </div>
            <div className="border-t border-border px-6 py-4">
              <div className="flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 rounded-xl bg-muted px-4 py-3 font-medium hover:bg-muted/80 btn-apple">Cancelar</button>
                <button onClick={() => void handleCreate()} disabled={!task.trim() || isCreating} className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br ${themeColor} px-4 py-3 font-medium text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 btn-apple-gradient`}>
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar plano
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <VoiceChatOrb />
    </>
  );
}
