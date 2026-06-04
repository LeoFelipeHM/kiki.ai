import {
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  FileSearch,
  Loader2,
  Pause,
  Plane,
  Play,
  Send,
  Share2,
  ShoppingCart,
  Sparkles,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  authorizeAgent,
  createAgentMessage,
  fetchAgent,
  fetchAgentMessages,
  patchAgentEffort,
  pauseAgent,
  resumeAgent,
} from '@/services/agents';
import type { Agent, AgentEffort, AgentMessage, AgentStep, AgentType } from '@/types/agent';

const TYPE_ICONS: Record<AgentType, LucideIcon> = {
  research: FileSearch,
  shopping: ShoppingCart,
  travel: Plane,
  custom: Bot,
};

const EFFORTS: { id: AgentEffort; label: string; color: string }[] = [
  { id: 'low', label: 'Baixo', color: 'from-green-500 to-emerald-500' },
  { id: 'medium', label: 'Médio', color: 'from-yellow-500 to-orange-500' },
  { id: 'high', label: 'Muito', color: 'from-red-500 to-rose-500' },
];

function formatTime(date?: Date) {
  return date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}

function getStepIcon(status: AgentStep['status']) {
  if (status === 'working') return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === 'error') return <AlertCircle className="h-5 w-5 text-red-500" />;
  return <Clock className="h-5 w-5 text-gray-300" />;
}

function statusText(agent: Agent) {
  if (agent.status === 'planned') return 'Plano pronto para autorização';
  if (agent.status === 'queued') return 'Aguardando início da execução';
  if (agent.status === 'working') return 'Executando a tarefa';
  if (agent.status === 'paused') return 'Execução pausada';
  if (agent.status === 'completed') return 'Tarefa concluída';
  return 'Erro encontrado';
}

function phaseText(agent: Agent) {
  if (agent.status === 'planned') return 'Revise o plano e autorize quando quiser iniciar.';
  if (agent.status === 'queued') return agent.currentAction || 'A Kiki iniciará assim que houver capacidade.';
  if (agent.status === 'working') return agent.currentAction || 'Executando a próxima etapa do plano.';
  if (agent.status === 'paused') return agent.currentAction || 'A execução continuará quando você retomar.';
  if (agent.status === 'completed') return 'Resultado final disponível na lousa.';
  return agent.errorMessage || 'A execução foi interrompida.';
}

function progressForDisplay(agent: Agent) {
  return agent.status === 'completed' ? 100 : Math.min(agent.progress, 99);
}

function trimTrailingUrlPunctuation(url: string) {
  const match = url.match(/^(.*?)([).,;:!?]+)?$/);
  return {
    href: match?.[1] || url,
    trailing: match?.[2] || '',
  };
}

type LinkMatch = {
  start: number;
  end: number;
  rawUrl: string;
  trailing: string;
};

function normalizeUrl(url: string) {
  return url.replace(/\s+/g, '').trim();
}

function whatsappUrlFromPhone(rawPhone: string) {
  let digits = rawPhone.replace(/\D+/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}`;
}

function collectLinkMatches(text: string): LinkMatch[] {
  const matches: LinkMatch[] = [];
  const occupied: Array<[number, number]> = [];

  const addMatch = (start: number, end: number, rawUrl: string, trailing = '') => {
    if (occupied.some(([s, e]) => start < e && end > s)) return;
    matches.push({ start, end, rawUrl: normalizeUrl(rawUrl), trailing });
    occupied.push([start, end]);
  };

  const markdownRegex = /\(?\[[^\]]+\]\(\s*(https?:\/\/[\s\S]*?)\s*\)\)?/g;
  let markdownMatch: RegExpExecArray | null;
  while ((markdownMatch = markdownRegex.exec(text)) !== null) {
    const rawUrl = markdownMatch[1].split(/\s*\)\s*\)?/)[0];
    addMatch(markdownMatch.index, markdownMatch.index + markdownMatch[0].length, rawUrl);
  }

  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    const rawUrl = urlMatch[0];
    const { href, trailing } = trimTrailingUrlPunctuation(rawUrl);
    addMatch(urlMatch.index, urlMatch.index + rawUrl.length, href, trailing);
  }

  const phoneRegex = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/g;
  let phoneMatch: RegExpExecArray | null;
  while ((phoneMatch = phoneRegex.exec(text)) !== null) {
    const nearby = text.slice(Math.max(0, phoneMatch.index - 80), Math.min(text.length, phoneMatch.index + phoneMatch[0].length + 80));
    if (!nearby.toLowerCase().includes('whatsapp')) continue;
    const whatsappUrl = whatsappUrlFromPhone(phoneMatch[0]);
    if (!whatsappUrl) continue;
    addMatch(phoneMatch.index, phoneMatch.index + phoneMatch[0].length, whatsappUrl);
  }

  return matches.sort((a, b) => a.start - b.start);
}

function isWhatsAppUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'wa.me' || host.endsWith('.wa.me') || host === 'api.whatsapp.com' || host.endsWith('.whatsapp.com');
  } catch {
    return false;
  }
}

function whatsappMessageForTask(task: string) {
  const cleanTask = task.replace(/\s+/g, ' ').trim();
  const lower = cleanTask.toLowerCase();
  if (lower.includes('oftalmo') || lower.includes('médico') || lower.includes('medico') || lower.includes('consulta')) {
    return 'Olá, tudo bem? Gostaria de saber a disponibilidade para uma consulta de oftalmologia.';
  }
  if (cleanTask) {
    return `Olá, tudo bem? Gostaria de saber mais informações sobre: ${cleanTask}.`;
  }
  return 'Olá, tudo bem? Gostaria de saber mais informações.';
}

function withWhatsAppMessage(url: string, message: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'wa.me' || parsed.hostname.toLowerCase().endsWith('.wa.me')) {
      parsed.searchParams.set('text', message);
      return parsed.toString();
    }
    if (parsed.hostname.toLowerCase() === 'api.whatsapp.com' || parsed.hostname.toLowerCase().endsWith('.whatsapp.com')) {
      parsed.searchParams.set('text', message);
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}

function siteButtonLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return `Abrir site: ${host}`;
  } catch {
    return 'Abrir site';
  }
}

function LinkedText({ text, whatsappContext }: { text: string; whatsappContext?: string }) {
  const linkMatches = collectLinkMatches(text);
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of linkMatches) {
    const start = match.start;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const href = match.rawUrl;
    const isWhatsApp = isWhatsAppUrl(href);
    const displayHref = isWhatsApp && whatsappContext ? withWhatsAppMessage(href, whatsappMessageForTask(whatsappContext)) : href;
    nodes.push(
      <a
        key={`${href}-${start}`}
        href={displayHref}
        target="_blank"
        rel="noreferrer"
        className={`my-1 inline-flex max-w-full items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm ${isWhatsApp ? 'bg-green-500 hover:bg-green-600 btn-apple' : 'bg-gradient-to-br from-blue-500 to-cyan-500 btn-apple-gradient'}`}
      >
        <span className="truncate">{isWhatsApp ? 'Abrir WhatsApp' : siteButtonLabel(href)}</span>
      </a>,
    );
    if (match.trailing) nodes.push(match.trailing);
    lastIndex = match.end;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return <>{nodes}</>;
}

export function AgentDetailScreen({
  agentId,
  onNavigateBack,
  onSessionExpired,
}: {
  agentId: string;
  onNavigateBack: () => void;
  onSessionExpired?: () => void;
}) {
  const { themeColor } = useTheme();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'chat'>('board');
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadAgent = useCallback(async (silent = false) => {
    try {
      const [nextAgent, nextMessages] = await Promise.all([
        fetchAgent(agentId),
        fetchAgentMessages(agentId),
      ]);
      setAgent(nextAgent);
      setMessages(nextMessages);
      setError(null);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      if (!silent) setError(e instanceof Error ? e.message : 'Não foi possível carregar o agente.');
    }
  }, [agentId, onSessionExpired]);

  useEffect(() => {
    void loadAgent();
  }, [loadAgent]);

  useEffect(() => {
    if (!agent || (agent.status !== 'queued' && agent.status !== 'working')) return;
    const id = window.setInterval(() => void loadAgent(true), 2500);
    return () => window.clearInterval(id);
  }, [agent, loadAgent]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const applyAgent = (next: Agent) => setAgent(next);

  const handleEffortChange = async (effort: AgentEffort) => {
    if (!agent) return;
    try {
      applyAgent(await patchAgentEffort(agent.id, effort));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível alterar o nível.');
    }
  };

  const handleAuthorize = async () => {
    if (!agent) return;
    applyAgent(await authorizeAgent(agent.id));
  };

  const handlePause = async () => {
    if (!agent) return;
    applyAgent(await pauseAgent(agent.id));
  };

  const handleResume = async () => {
    if (!agent) return;
    applyAgent(await resumeAgent(agent.id));
  };

  const handleSendMessage = async () => {
    if (!agent || !newMessage.trim() || isSendingMessage) return;
    const content = newMessage.trim();
    setNewMessage('');
    setIsSendingMessage(true);
    try {
      const message = await createAgentMessage(agent.id, content);
      setMessages((prev) => [...prev, message]);
      await loadAgent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar mensagem.');
      setNewMessage(content);
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (!agent) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Icon = TYPE_ICONS[agent.type];
  const canChangeEffort = agent.status === 'planned' || agent.status === 'paused';
  const canSendMessage = agent.status !== 'queued' && agent.status !== 'working';
  const progress = progressForDisplay(agent);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="mb-3 flex items-center gap-3">
          <button onClick={onNavigateBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted btn-apple">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${agent.color} ${agent.status === 'working' ? 'agent-avatar-active' : ''}`}>
            {agent.status === 'working' && <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-blue-500"><div className="absolute inset-0 animate-ping rounded-full bg-blue-500" /></div>}
            <Icon className={`relative z-10 h-6 w-6 text-white ${agent.status === 'working' ? 'agent-icon-working' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold">{agent.name}</h2>
            <p className="truncate text-xs text-muted-foreground">{agent.currentAction || agent.task}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setActiveTab('board')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all btn-apple ${activeTab === 'board' ? `bg-gradient-to-br ${themeColor} text-white shadow-md` : 'bg-muted hover:bg-muted/80'}`}>Lousa</button>
          <button onClick={() => setActiveTab('chat')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all btn-apple ${activeTab === 'chat' ? `bg-gradient-to-br ${themeColor} text-white shadow-md` : 'bg-muted hover:bg-muted/80'}`}>Chat</button>
        </div>
      </div>

      {error && <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'board' && (
          <div className="space-y-4 p-4">
            <div className={`rounded-2xl bg-gradient-to-br ${agent.color} p-4 text-white shadow-lg`}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Brain className="h-5 w-5" />
                </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Status do Agente</p>
                    <p className="text-xs text-white/80">{statusText(agent)}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-white/75">{phaseText(agent)}</p>
                  </div>
                {agent.status === 'working' && (
                  <div className="relative h-8 w-8">
                    <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/40">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
              {agent.status !== 'planned' && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-white/90">
                    <span>Progresso Geral</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold">Nível de pensamento</h3>
              <div className="flex gap-2">
                {EFFORTS.map((effort) => (
                  <button key={effort.id} disabled={!canChangeEffort} onClick={() => void handleEffortChange(effort.id)} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all btn-apple disabled:opacity-60 ${agent.effort === effort.id ? `bg-gradient-to-br ${effort.color} text-white shadow-md` : 'bg-muted hover:bg-muted/80'}`}>
                    {effort.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {(agent.status === 'planned' || agent.status === 'error') && (
                <button onClick={() => void handleAuthorize()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 px-4 py-3 text-sm font-medium text-white shadow-md btn-apple-gradient">
                  <Play className="h-4 w-4" />
                  Autorizar execução
                </button>
              )}
              {(agent.status === 'queued' || agent.status === 'working') && (
                <button onClick={() => void handlePause()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-medium text-white shadow-md btn-apple">
                  <Pause className="h-4 w-4" />
                  Pausar
                </button>
              )}
              {agent.status === 'paused' && (
                <button onClick={() => void handleResume()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 px-4 py-3 text-sm font-medium text-white shadow-md btn-apple-gradient">
                  <Play className="h-4 w-4" />
                  Retomar
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-white p-4">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Plano de execução
              </h3>
              <div className="space-y-3">
                {agent.steps.map((step, index) => (
                  <div key={step.id} className="relative">
                    {index < agent.steps.length - 1 && <div className="absolute left-[18px] top-10 h-full w-0.5 bg-border" />}
                    <div className="flex gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${step.status === 'completed' ? 'bg-green-100' : step.status === 'working' ? 'bg-blue-100' : step.status === 'error' ? 'bg-red-100' : 'bg-gray-100'}`}>
                        {getStepIcon(step.status)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`mb-1 text-sm font-medium ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>{step.description}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(step.timestamp)}</p>
                        {step.details && <p className="mt-1 inline-block rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">{step.details}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {agent.status === 'error' && agent.errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{agent.errorMessage}</div>
            )}

            {agent.status === 'completed' && agent.results && (
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    Resultado
                  </h3>
                  <button
                    onClick={() => {
                      const blob = new Blob([agent.results || ''], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${agent.name.replace(/\s+/g, '_')}_resultado.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 px-3 py-1.5 text-xs font-medium text-white shadow-md btn-apple-gradient"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar TXT
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  <LinkedText text={agent.results} whatsappContext={agent.task} />
                </p>
                <button
                  onClick={() => void navigator.clipboard.writeText(agent.results || '')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/80 btn-apple"
                >
                  <Share2 className="h-4 w-4" />
                  Copiar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="flex gap-3">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${agent.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="max-w-[75%] rounded-2xl bg-muted px-4 py-2">
                  <p className="text-sm leading-relaxed">Vou executar: “{agent.task}”. Adicione instruções antes de autorizar, se precisar.</p>
                </div>
              </div>
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${message.role === 'agent' ? `bg-gradient-to-br ${agent.color}` : `bg-gradient-to-br ${themeColor}`}`}>
                    {message.role === 'agent' ? <Icon className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
                  </div>
                  <div className={`max-w-[75%] ${message.role === 'user' ? 'items-end' : ''}`}>
                    <div className={`rounded-2xl px-4 py-2 ${message.role === 'agent' ? 'bg-muted' : `bg-gradient-to-br ${themeColor} text-white`}`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        <LinkedText text={message.content} whatsappContext={agent.task} />
                      </p>
                    </div>
                    <p className="mt-1 px-2 text-xs text-muted-foreground">{formatTime(message.createdAt)}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void handleSendMessage()} disabled={!canSendMessage} placeholder={canSendMessage ? 'Enviar instrução para o agente...' : 'Agente em execução...'} className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none disabled:opacity-60 input-apple" />
                <button onClick={() => void handleSendMessage()} disabled={!newMessage.trim() || !canSendMessage || isSendingMessage} className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${themeColor} text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 btn-apple-gradient`}>
                  {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
