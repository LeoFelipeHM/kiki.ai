import type { Agent, AgentEffort, AgentStep, AgentType } from '@/types/agent';

export const AGENT_TYPE_CONFIG: Record<
  AgentType,
  {
    name: string;
    color: string;
    description: string;
  }
> = {
  research: {
    name: 'Pesquisador',
    color: 'from-blue-500 to-cyan-500',
    description: 'Pesquisa, compara fontes e sintetiza respostas.',
  },
  shopping: {
    name: 'Compras',
    color: 'from-purple-500 to-pink-500',
    description: 'Compara opções, preço, prazo e risco de compra.',
  },
  travel: {
    name: 'Viagens',
    color: 'from-orange-500 to-yellow-500',
    description: 'Organiza rotas, datas, hospedagem e alternativas.',
  },
  custom: {
    name: 'Personalizado',
    color: 'from-green-500 to-emerald-500',
    description: 'Planeja e executa tarefas abertas.',
  },
};

const effortExtraSteps: Record<AgentEffort, string[]> = {
  low: [],
  medium: ['Validar coerencia dos achados antes da resposta final'],
  high: [
    'Cruzar evidencias e procurar inconsistencias',
    'Refinar a resposta com alternativas e proximos passos',
  ],
};

const typePlans: Record<AgentType, string[]> = {
  research: [
    'Entender o objetivo da pesquisa e os criterios de resposta',
    'Definir termos de busca e fontes prioritarias',
    'Coletar informacoes relevantes',
    'Sintetizar os achados em uma resposta acionavel',
  ],
  shopping: [
    'Entender o produto, restricoes e criterios de compra',
    'Mapear opcoes disponiveis e comparaveis',
    'Comparar preco, prazo, confiabilidade e beneficios',
    'Recomendar as melhores opcoes com ressalvas',
  ],
  travel: [
    'Entender origem, destino, datas e preferencias',
    'Mapear rotas, horarios e restricoes importantes',
    'Comparar alternativas por custo, tempo e conveniencia',
    'Montar recomendacao final de viagem',
  ],
  custom: [
    'Interpretar o pedido e separar objetivos',
    'Quebrar o trabalho em tarefas executaveis',
    'Executar as tarefas na ordem mais eficiente',
    'Consolidar resultado e proximas acoes',
  ],
};

export function effortLabel(effort: AgentEffort) {
  if (effort === 'low') return 'Baixo';
  if (effort === 'medium') return 'Medio';
  return 'Muito';
}

export function effortDescription(effort: AgentEffort) {
  if (effort === 'low') return 'Pouco pensamento, execucao rapida.';
  if (effort === 'medium') return 'Equilibrio entre velocidade e verificacao.';
  return 'Mais pensamento, mais validacoes e resposta mais completa.';
}

export function buildAgentPlan(task: string, type: AgentType, effort: AgentEffort, agentId = 'local'): AgentStep[] {
  const steps = [...typePlans[type], ...effortExtraSteps[effort]];
  return steps.map((description, index) => ({
    id: `${Date.now() + index}`,
    agentId,
    position: index,
    description,
    status: 'pending',
    timestamp: new Date(),
    details: index === 0 ? `Pedido: ${task}` : undefined,
  }));
}

export function createPlannedAgent({
  id,
  task,
  type,
  effort,
}: {
  id: string;
  task: string;
  type: AgentType;
  effort: AgentEffort;
}): Agent {
  const config = AGENT_TYPE_CONFIG[type];
  return {
    id,
    userId: 'local',
    name: `${config.name} ${id}`,
    type,
    task,
    status: 'planned',
    progress: 0,
    createdAt: new Date(),
    color: config.color,
    effort,
    sortOrder: 0,
    steps: buildAgentPlan(task, type, effort, id),
  };
}

export function authorizeAgent(agent: Agent): Agent {
  const nextSteps = agent.steps.map((step, index) => ({
    ...step,
    status: index === 0 ? ('working' as const) : ('pending' as const),
    timestamp: index === 0 ? new Date() : step.timestamp,
  }));

  return {
    ...agent,
    status: 'working',
    progress: 0,
    steps: nextSteps,
    currentAction: nextSteps[0]?.description ?? 'Executando plano',
    lastRunAt: Date.now(),
  };
}

export function pauseAgent(agent: Agent): Agent {
  return {
    ...agent,
    status: 'paused',
    currentAction: 'Execucao pausada',
  };
}

function stepDetail(step: AgentStep, agent: Agent) {
  if (agent.type === 'research' && step.description.includes('Coletar')) {
    return 'Fontes simuladas analisadas e pontos principais separados';
  }
  if (step.description.includes('Validar') || step.description.includes('Cruzar')) {
    return 'Sem conflitos criticos encontrados na simulacao';
  }
  return 'Concluido';
}

export function buildAgentResult(agent: Agent) {
  const effortText =
    agent.effort === 'high'
      ? 'com verificacao ampliada e alternativas'
      : agent.effort === 'medium'
        ? 'com validacao essencial'
        : 'com foco em velocidade';

  if (agent.type === 'research') {
    return `Resposta da pesquisa sobre "${agent.task}":\n\n- Objetivo entendido e dividido em etapas.\n- Principais achados foram organizados por relevancia.\n- Conclusao: a melhor resposta e priorizar fontes recentes, comparar pelo menos duas referencias independentes e transformar os dados em uma decisao pratica.\n\nEntrega gerada ${effortText}.`;
  }

  if (agent.type === 'shopping') {
    return `Resultado para "${agent.task}":\n\n- Criterios de compra levantados.\n- Opcoes comparadas por preco, prazo e confiabilidade.\n- Recomendacao: escolher a opcao com melhor equilibrio entre custo total, garantia e reputacao, evitando a menor oferta quando houver risco operacional.\n\nEntrega gerada ${effortText}.`;
  }

  if (agent.type === 'travel') {
    return `Plano de viagem para "${agent.task}":\n\n- Preferencias e restricoes separadas.\n- Alternativas comparadas por tempo, custo e conveniencia.\n- Recomendacao: reservar a combinacao com menor friccao logistica e manter uma alternativa flexivel para mudancas de data.\n\nEntrega gerada ${effortText}.`;
  }

  return `Resultado do agente para "${agent.task}":\n\n- Pedido interpretado.\n- Tarefas separadas e executadas em ordem.\n- Resultado consolidado com proximos passos claros para continuar a implementacao futura.\n\nEntrega gerada ${effortText}.`;
}

export function advanceAgent(agent: Agent, now = Date.now()): Agent {
  if (agent.status !== 'working') return agent;

  const delay = agent.effort === 'high' ? 2600 : agent.effort === 'medium' ? 1900 : 1300;
  if (agent.lastRunAt && now - agent.lastRunAt < delay) return agent;

  const workingIndex = agent.steps.findIndex((step) => step.status === 'working');
  const currentIndex =
    workingIndex >= 0 ? workingIndex : agent.steps.findIndex((step) => step.status === 'pending');

  if (currentIndex < 0) {
    return {
      ...agent,
      status: 'completed',
      progress: 100,
      currentAction: 'Resposta final gerada',
      completedAt: new Date(),
      results: agent.results ?? buildAgentResult(agent),
      lastRunAt: now,
    };
  }

  const nextSteps = agent.steps.map((step, index) => {
    if (index === currentIndex) {
      return {
        ...step,
        status: 'completed' as const,
        timestamp: new Date(),
        details: stepDetail(step, agent),
      };
    }
    if (index === currentIndex + 1) {
      return {
        ...step,
        status: 'working' as const,
        timestamp: new Date(),
      };
    }
    return step;
  });

  const completed = nextSteps.filter((step) => step.status === 'completed').length;
  const progress = Math.round((completed / Math.max(nextSteps.length, 1)) * 100);
  const nextWorking = nextSteps.find((step) => step.status === 'working');
  const finished = !nextWorking && completed === nextSteps.length;

  return {
    ...agent,
    steps: nextSteps,
    status: finished ? 'completed' : 'working',
    progress: finished ? 100 : progress,
    currentAction: finished ? 'Resposta final gerada' : nextWorking?.description,
    completedAt: finished ? new Date() : agent.completedAt,
    results: finished ? buildAgentResult(agent) : agent.results,
    lastRunAt: now,
  };
}
