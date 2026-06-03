export type AgentType = 'research' | 'shopping' | 'travel' | 'custom';

export type AgentStatus = 'planned' | 'idle' | 'working' | 'paused' | 'completed' | 'error';

export type AgentEffort = 'low' | 'medium' | 'high';

export type AgentStepStatus = 'pending' | 'working' | 'completed' | 'error';

export type AgentStep = {
  id: string;
  agentId: string;
  position: number;
  description: string;
  status: AgentStepStatus;
  timestamp: Date;
  details?: string;
};

export type Agent = {
  id: string;
  userId: string;
  name: string;
  type: AgentType;
  task: string;
  status: AgentStatus;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  currentAction?: string;
  results?: string;
  steps: AgentStep[];
  color: string;
  effort: AgentEffort;
  errorMessage?: string;
  sortOrder: number;
  queuedAt?: Date;
  startedAt?: Date;
  lastRunAt?: number;
};

export type AgentMessage = {
  id: string;
  agentId: string;
  userId: string;
  role: 'user' | 'agent';
  content: string;
  createdAt: Date;
};
