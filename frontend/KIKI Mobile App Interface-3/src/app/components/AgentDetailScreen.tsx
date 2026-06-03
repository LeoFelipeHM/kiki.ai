import { ChevronLeft, Send, Loader2, CheckCircle2, AlertCircle, Clock, Play, Pause, Trash2, Download, Share2, Sparkles, Brain, Zap, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import type { Agent, AgentStep } from './AgentsScreen';

interface AgentDetailScreenProps {
  agent: Agent;
  onNavigateBack: () => void;
  onUpdateAgent?: (updatedAgent: Agent) => void;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export function AgentDetailScreen({ agent, onNavigateBack, onUpdateAgent }: AgentDetailScreenProps) {
  const { themeColor } = useTheme();
  const [activeTab, setActiveTab] = useState<'board' | 'chat'>('board');
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>(agent.effort || 'medium');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'agent',
      content: `Olá! Sou seu agente ${agent.name}. Vou trabalhar na tarefa: "${agent.task}". Posso começar quando você quiser!`,
      timestamp: new Date(agent.createdAt),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      content: newMessage,
      timestamp: new Date(),
    };

    const agentReply: ChatMessage = {
      id: chatMessages.length + 2,
      type: 'agent',
      content: 'Entendido! Vou considerar isso na minha pesquisa.',
      timestamp: new Date(),
    };

    setChatMessages([...chatMessages, userMessage, agentReply]);
    setNewMessage('');
  };

  const getStepIcon = (status: AgentStep['status']) => {
    switch (status) {
      case 'working':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-300" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleEffortChange = (newEffort: 'low' | 'medium' | 'high') => {
    setEffort(newEffort);
    if (onUpdateAgent) {
      onUpdateAgent({ ...agent, effort: newEffort });
    }
  };

  const getEffortLabel = (effortLevel: 'low' | 'medium' | 'high') => {
    switch (effortLevel) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
    }
  };

  const getEffortColor = (effortLevel: 'low' | 'medium' | 'high') => {
    switch (effortLevel) {
      case 'low': return 'from-green-500 to-emerald-500';
      case 'medium': return 'from-yellow-500 to-orange-500';
      case 'high': return 'from-red-500 to-rose-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onNavigateBack}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center btn-apple"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-md relative ${
            agent.status === 'working' ? 'agent-avatar-active' : ''
          }`}>
            {agent.status === 'working' && (
              <>
                <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse" />
                <div className="absolute -inset-1 bg-gradient-to-br from-white/40 to-transparent rounded-2xl blur-sm animate-pulse" />
                <div className="absolute -top-1 -right-1">
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white">
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping" />
                  </div>
                </div>
              </>
            )}
            <agent.icon className={`w-6 h-6 text-white relative z-10 ${
              agent.status === 'working' ? 'agent-icon-working' : ''
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base truncate">{agent.name}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {agent.status === 'working' ? agent.currentAction : agent.task}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-all btn-apple ${
              activeTab === 'board'
                ? `bg-gradient-to-br ${themeColor} text-white shadow-md`
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Lousa
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-all btn-apple ${
              activeTab === 'chat'
                ? `bg-gradient-to-br ${themeColor} text-white shadow-md`
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Chat
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'board' && (
          <div className="p-4 space-y-4">
            {/* Agent Status Card */}
            <div className={`bg-gradient-to-br ${agent.color} rounded-2xl p-4 text-white shadow-lg`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Status do Agente</p>
                  <p className="text-xs text-white/80">
                    {agent.status === 'working' ? 'Trabalhando ativamente' :
                     agent.status === 'completed' ? 'Tarefa concluída' :
                     agent.status === 'paused' ? 'Em pausa' :
                     agent.status === 'error' ? 'Erro encontrado' : 'Aguardando início'}
                  </p>
                </div>
                {agent.status === 'working' && (
                  <div className="w-8 h-8 relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
                    <div className="absolute inset-0 bg-white/40 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>

              {agent.status !== 'idle' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-white/90 mb-1">
                    <span>Progresso Geral</span>
                    <span className="font-semibold">{agent.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Effort Level Selector - Only when working */}
            {agent.status === 'working' && (
              <div className="bg-white rounded-2xl border border-border p-4">
                <h3 className="font-semibold mb-3 text-sm">Nível de Esforço</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEffortChange('low')}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all btn-apple ${
                      effort === 'low'
                        ? `bg-gradient-to-br ${getEffortColor('low')} text-white shadow-md`
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {getEffortLabel('low')}
                  </button>
                  <button
                    onClick={() => handleEffortChange('medium')}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all btn-apple ${
                      effort === 'medium'
                        ? `bg-gradient-to-br ${getEffortColor('medium')} text-white shadow-md`
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {getEffortLabel('medium')}
                  </button>
                  <button
                    onClick={() => handleEffortChange('high')}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all btn-apple ${
                      effort === 'high'
                        ? `bg-gradient-to-br ${getEffortColor('high')} text-white shadow-md`
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {getEffortLabel('high')}
                  </button>
                </div>
              </div>
            )}

            {/* Steps Timeline */}
            <div className="bg-white rounded-2xl border border-border p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Ações em Andamento
              </h3>

              {agent.steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma ação iniciada ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {agent.steps.map((step, index) => (
                    <div key={step.id} className="relative">
                      {/* Connection Line */}
                      {index < agent.steps.length - 1 && (
                        <div className="absolute left-[18px] top-10 w-0.5 h-full bg-border" />
                      )}

                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          step.status === 'completed' ? 'bg-green-100' :
                          step.status === 'working' ? 'bg-blue-100' :
                          step.status === 'error' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {getStepIcon(step.status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm mb-1 ${
                            step.status === 'pending' ? 'text-muted-foreground' : ''
                          }`}>
                            {step.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(step.timestamp)}
                          </p>
                          {step.details && (
                            <p className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded inline-block">
                              {step.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Insights */}
            {agent.status === 'working' && (
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-blue-900 mb-1">Trabalhando agora</p>
                    <p className="text-sm text-blue-700">
                      {agent.currentAction || 'Processando informações...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Section - Only when completed */}
            {agent.status === 'completed' && agent.results && (
              <>
                <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-green-900">Tarefa Concluída</p>
                      <p className="text-xs text-green-700">
                        {agent.completedAt ? formatTime(agent.completedAt) : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-green-500" />
                      Resultados
                    </h3>
                    <button
                      onClick={() => {
                        // Create PDF download
                        const blob = new Blob([agent.results || ''], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${agent.name.replace(/\s+/g, '_')}_resultado.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg btn-apple-gradient shadow-md text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar PDF
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {agent.results}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(agent.results || '');
                      alert('Resultados copiados!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl btn-apple text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    Copiar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'agent'
                      ? `bg-gradient-to-br ${agent.color}`
                      : `bg-gradient-to-br ${themeColor}`
                  }`}>
                    {message.type === 'agent' ? (
                      <agent.icon className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message */}
                  <div className={`flex-1 max-w-[75%] ${message.type === 'user' ? 'items-end' : ''}`}>
                    <div className={`rounded-2xl px-4 py-2 ${
                      message.type === 'agent'
                        ? 'bg-muted'
                        : `bg-gradient-to-br ${themeColor} text-white`
                    }`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Enviar mensagem para o agente..."
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${themeColor} text-white flex items-center justify-center btn-apple-gradient shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
