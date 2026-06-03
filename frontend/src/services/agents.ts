import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';
import type { Agent, AgentEffort, AgentMessage, AgentStep, AgentType } from '@/types/agent';

type AgentStepDto = {
  id: string;
  agent_id: string;
  position: number;
  description: string;
  status: AgentStep['status'];
  details?: string | null;
  created_at: string;
  updated_at: string;
};

type AgentDto = {
  id: string;
  user_id: string;
  name: string;
  type: AgentType;
  task: string;
  status: Agent['status'];
  effort: AgentEffort;
  progress: number;
  color: string;
  current_action?: string | null;
  results?: string | null;
  error_message?: string | null;
  sort_order: number;
  queued_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  steps: AgentStepDto[];
};

type AgentMessageDto = {
  id: string;
  agent_id: string;
  user_id: string;
  role: AgentMessage['role'];
  content: string;
  created_at: string;
};

function parseDate(value?: string | null): Date | undefined {
  return value ? new Date(value) : undefined;
}

function toAgentStep(dto: AgentStepDto): AgentStep {
  return {
    id: dto.id,
    agentId: dto.agent_id,
    position: dto.position,
    description: dto.description,
    status: dto.status,
    timestamp: new Date(dto.updated_at || dto.created_at),
    details: dto.details ?? undefined,
  };
}

function toAgent(dto: AgentDto): Agent {
  return {
    id: dto.id,
    userId: dto.user_id,
    name: dto.name,
    type: dto.type,
    task: dto.task,
    status: dto.status,
    effort: dto.effort,
    progress: dto.progress,
    color: dto.color,
    currentAction: dto.current_action ?? undefined,
    results: dto.results ?? undefined,
    errorMessage: dto.error_message ?? undefined,
    sortOrder: dto.sort_order,
    queuedAt: parseDate(dto.queued_at),
    startedAt: parseDate(dto.started_at),
    completedAt: parseDate(dto.completed_at),
    createdAt: new Date(dto.created_at),
    steps: dto.steps.map(toAgentStep),
  };
}

function toMessage(dto: AgentMessageDto): AgentMessage {
  return {
    id: dto.id,
    agentId: dto.agent_id,
    userId: dto.user_id,
    role: dto.role,
    content: dto.content,
    createdAt: new Date(dto.created_at),
  };
}

async function parseAgentResponse(res: Response, fallback: string): Promise<Agent> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, fallback));
  }
  return toAgent((await res.json()) as AgentDto);
}

async function parseAgentListResponse(res: Response, fallback: string): Promise<Agent[]> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, fallback));
  }
  return ((await res.json()) as AgentDto[]).map(toAgent);
}

export async function fetchAgents(): Promise<Agent[]> {
  try {
    return parseAgentListResponse(await authorizedFetch('/agents'), 'Não foi possível carregar agentes.');
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw e;
  }
}

export async function createAgent(input: {
  task: string;
  type: AgentType;
  effort: AgentEffort;
  name?: string;
}): Promise<Agent> {
  const res = await authorizedFetch('/agents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseAgentResponse(res, 'Não foi possível criar o agente.');
}

export async function fetchAgent(agentId: string): Promise<Agent> {
  return parseAgentResponse(await authorizedFetch(`/agents/${agentId}`), 'Não foi possível carregar o agente.');
}

export async function patchAgentEffort(agentId: string, effort: AgentEffort): Promise<Agent> {
  const res = await authorizedFetch(`/agents/${agentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ effort }),
  });
  return parseAgentResponse(res, 'Não foi possível atualizar o agente.');
}

export async function authorizeAgent(agentId: string): Promise<Agent> {
  const res = await authorizedFetch(`/agents/${agentId}/authorize`, { method: 'POST' });
  return parseAgentResponse(res, 'Não foi possível autorizar o agente.');
}

export async function pauseAgent(agentId: string): Promise<Agent> {
  const res = await authorizedFetch(`/agents/${agentId}/pause`, { method: 'POST' });
  return parseAgentResponse(res, 'Não foi possível pausar o agente.');
}

export async function resumeAgent(agentId: string): Promise<Agent> {
  const res = await authorizedFetch(`/agents/${agentId}/resume`, { method: 'POST' });
  return parseAgentResponse(res, 'Não foi possível retomar o agente.');
}

export async function deleteAgent(agentId: string): Promise<void> {
  const res = await authorizedFetch(`/agents/${agentId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível excluir o agente.'));
  }
}

export async function reorderAgents(agentIds: string[]): Promise<Agent[]> {
  const res = await authorizedFetch('/agents/reorder', {
    method: 'POST',
    body: JSON.stringify({ agent_ids: agentIds }),
  });
  return parseAgentListResponse(res, 'Não foi possível reordenar agentes.');
}

export async function fetchAgentMessages(agentId: string): Promise<AgentMessage[]> {
  const res = await authorizedFetch(`/agents/${agentId}/messages`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível carregar mensagens.'));
  }
  return ((await res.json()) as AgentMessageDto[]).map(toMessage);
}

export async function createAgentMessage(agentId: string, content: string): Promise<AgentMessage> {
  const res = await authorizedFetch(`/agents/${agentId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível enviar mensagem.'));
  }
  return toMessage((await res.json()) as AgentMessageDto);
}
