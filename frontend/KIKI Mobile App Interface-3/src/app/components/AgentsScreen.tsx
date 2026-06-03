import { Plus, Menu, Sparkles, Search, Clock, CheckCircle2, AlertCircle, Loader2, Play, Pause, Trash2, MessageCircle, Eye, MoreVertical, Zap, Brain, Globe, FileSearch, Plane, ShoppingCart, BarChart3, Bot, GripVertical, type LucideIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export interface Agent {
  id: number;
  name: string;
  task: string;
  status: 'idle' | 'working' | 'completed' | 'error' | 'paused';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  currentAction?: string;
  results?: string;
  steps: AgentStep[];
  icon: LucideIcon;
  color: string;
  effort?: 'low' | 'medium' | 'high';
}

export interface AgentStep {
  id: number;
  description: string;
  status: 'pending' | 'working' | 'completed' | 'error';
  timestamp: Date;
  details?: string;
}

interface AgentsScreenProps {
  onOpenMenu?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHome?: () => void;
  onNavigateToAgentDetail?: (agentId: number) => void;
  userName?: string;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
}

interface AgentCardProps {
  agent: Agent;
  index: number;
  moveAgent: (dragIndex: number, hoverIndex: number) => void;
  onNavigateToAgentDetail?: (agentId: number) => void;
  handleStartAgent: (id: number) => void;
  handlePauseAgent: (id: number) => void;
  handleDeleteAgent: (id: number) => void;
}

const AgentCard = ({
  agent,
  index,
  moveAgent,
  onNavigateToAgentDetail,
  handleStartAgent,
  handlePauseAgent,
  handleDeleteAgent,
}: AgentCardProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'agent',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveAgent(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'agent',
    item: () => {
      return { id: agent.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const opacity = isDragging ? 0.4 : 1;

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      style={{ opacity }}
      onClick={() => onNavigateToAgentDetail?.(agent.id)}
      className="bg-white rounded-2xl border border-border overflow-hidden card-apple cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0 shadow-md relative ${
            agent.status === 'working' ? 'agent-avatar-active' : ''
          }`}>
            {agent.status === 'working' && (
              <>
                <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse" />
                <div className="absolute -inset-1 bg-gradient-to-br from-white/40 to-transparent rounded-2xl blur-sm animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white">
                  <div className="w-full h-full bg-blue-500 rounded-full animate-ping" />
                </div>
              </>
            )}
            <agent.icon className={`w-6 h-6 text-white relative z-10 ${
              agent.status === 'working' ? 'agent-icon-working' : ''
            }`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">{agent.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {agent.task}
            </p>
            {agent.currentAction && agent.status === 'working' && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                {agent.currentAction}
              </p>
            )}
          </div>

          {/* Drag Handle */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-6 flex-shrink-0 cursor-move text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        </div>

        {/* Progress Bar */}
        {agent.status !== 'idle' && agent.status !== 'completed' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso</span>
              <span className="font-medium">{agent.progress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${agent.color} transition-all duration-500`}
                style={{ width: `${agent.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {agent.status === 'idle' && (
            <>
              <button
                onClick={() => handleStartAgent(agent.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl btn-apple-gradient shadow-md text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                Iniciar
              </button>
              <button
                onClick={() => handleDeleteAgent(agent.id)}
                className="flex items-center justify-center w-10 h-10 hover:bg-red-50 text-red-600 rounded-xl btn-apple"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {agent.status === 'working' && (
            <button
              onClick={() => handlePauseAgent(agent.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl btn-apple shadow-md text-sm font-medium"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
          )}
          {agent.status === 'paused' && (
            <>
              <button
                onClick={() => handleStartAgent(agent.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl btn-apple-gradient shadow-md text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                Retomar
              </button>
              <button
                onClick={() => handleDeleteAgent(agent.id)}
                className="flex items-center justify-center w-10 h-10 hover:bg-red-50 text-red-600 rounded-xl btn-apple"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {agent.status === 'completed' && (
            <button
              onClick={() => handleDeleteAgent(agent.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 rounded-xl btn-apple text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export function AgentsScreen({
  onOpenMenu,
  onNavigateToProfile,
  onNavigateToHome,
  onNavigateToAgentDetail,
  userName = 'Maria Silva',
  agents,
  setAgents
}: AgentsScreenProps) {
  const { themeColor } = useTheme();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgentTask, setNewAgentTask] = useState('');
  const [selectedAgentType, setSelectedAgentType] = useState<'research' | 'shopping' | 'travel' | 'custom'>('custom');

  const agentTypes = [
    { id: 'research' as const, name: 'Pesquisador', icon: FileSearch, agentIcon: FileSearch, color: 'from-blue-500 to-cyan-500', description: 'Pesquisa e análise de dados' },
    { id: 'shopping' as const, name: 'Compras', icon: ShoppingCart, agentIcon: ShoppingCart, color: 'from-purple-500 to-pink-500', description: 'Comparar preços e produtos' },
    { id: 'travel' as const, name: 'Viagens', icon: Plane, agentIcon: Plane, color: 'from-orange-500 to-yellow-500', description: 'Passagens e hotéis' },
    { id: 'custom' as const, name: 'Personalizado', icon: Bot, agentIcon: Bot, color: 'from-green-500 to-emerald-500', description: 'Tarefa customizada' },
  ];

  const handleCreateAgent = () => {
    if (!newAgentTask.trim()) return;

    const selectedType = agentTypes.find(t => t.id === selectedAgentType);
    const newAgent: Agent = {
      id: Math.max(...agents.map(a => a.id), 0) + 1,
      name: `Agente ${agents.length + 1}`,
      task: newAgentTask,
      status: 'idle',
      progress: 0,
      createdAt: new Date(),
      icon: selectedType?.agentIcon || Bot,
      color: selectedType?.color || 'from-purple-500 to-pink-500',
      steps: [],
    };

    setAgents([newAgent, ...agents]);
    setNewAgentTask('');
    setShowCreateModal(false);
  };

  const handleStartAgent = (id: number) => {
    setAgents(agents.map(agent =>
      agent.id === id ? { ...agent, status: 'working' as const } : agent
    ));
  };

  const handlePauseAgent = (id: number) => {
    setAgents(agents.map(agent =>
      agent.id === id ? { ...agent, status: 'paused' as const } : agent
    ));
  };

  const moveAgent = (dragIndex: number, hoverIndex: number) => {
    const newAgents = [...agents];
    const [removed] = newAgents.splice(dragIndex, 1);
    newAgents.splice(hoverIndex, 0, removed);
    setAgents(newAgents);
  };

  const handleDeleteAgent = (id: number) => {
    const confirmDelete = window.confirm('Deseja excluir este agente?');
    if (confirmDelete) {
      setAgents(agents.filter(agent => agent.id !== id));
    }
  };

  const activeAgents = agents.filter(a => a.status === 'working').length;
  const completedAgents = agents.filter(a => a.status === 'completed').length;

  return (
    <>
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={onNavigateToHome}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors btn-apple"
            >
              Kiki
            </button>
            <button
              onClick={onNavigateToProfile}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-sm btn-apple-gradient shadow-sm`}
            >
              <span className="text-white font-medium">{userName.charAt(0).toUpperCase()}</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Agentes Kiki</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {activeAgents} trabalhando • {completedAgents} concluídos
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${themeColor} text-white flex items-center justify-center btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${themeColor} opacity-20 flex items-center justify-center mb-4`}>
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhum agente ainda</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Crie seu primeiro agente para começar
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-br ${themeColor} text-white rounded-full btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Criar Agente</span>
              </button>
            </div>
          ) : (
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-3">
                {agents.map((agent, index) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    index={index}
                    moveAgent={moveAgent}
                    onNavigateToAgentDetail={onNavigateToAgentDetail}
                    handleStartAgent={handleStartAgent}
                    handlePauseAgent={handlePauseAgent}
                    handleDeleteAgent={handleDeleteAgent}
                  />
                ))}
              </div>
            </DndProvider>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
          style={{ animation: 'fadeIn 200ms ease-out' }}
        >
          <div
            className="bg-background rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 200ms ease-out' }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Criar Novo Agente</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center btn-apple"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-6">
                <label className="text-sm font-semibold text-muted-foreground mb-3 block">
                  Tipo de Agente
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {agentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedAgentType(type.id)}
                      className={`p-4 rounded-2xl border-2 transition-all btn-apple text-left ${
                        selectedAgentType === type.id
                          ? `border-purple-500 bg-gradient-to-br ${type.color} bg-opacity-10`
                          : 'border-border hover:border-purple-500/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-3 shadow-md`}>
                        <type.icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-semibold text-sm mb-1">{type.name}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Descreva a tarefa
                </label>
                <textarea
                  value={newAgentTask}
                  onChange={(e) => setNewAgentTask(e.target.value)}
                  placeholder="Ex: Pesquisar passagens aéreas de SP para Paris em julho com melhor preço..."
                  rows={4}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none resize-none input-apple"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 btn-apple font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateAgent}
                  disabled={!newAgentTask.trim()}
                  className={`flex-1 px-4 py-3 rounded-xl bg-gradient-to-br ${themeColor} text-white btn-apple-gradient font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
                >
                  Criar Agente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
