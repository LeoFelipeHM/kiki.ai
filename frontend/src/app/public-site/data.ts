import {
  AlarmClock,
  Brain,
  CalendarCheck,
  Clock,
  FileText,
  ListTodo,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';

export const features = [
  {
    icon: Brain,
    title: 'Aprende com sua rotina',
    description: 'Entende padrões, preferências e prioridades para sugerir uma organização mais inteligente.',
  },
  {
    icon: CalendarCheck,
    title: 'Compromissos claros',
    description: 'Centraliza agenda, tarefas e lembretes para você saber o que precisa de atenção.',
  },
  {
    icon: MessageCircle,
    title: 'Conversa natural',
    description: 'Você pede em linguagem simples e a Kiki transforma isso em ações organizadas.',
  },
  {
    icon: AlarmClock,
    title: 'Lembretes no tempo certo',
    description: 'Receba avisos úteis sem excesso de ruído, respeitando o contexto do seu dia.',
  },
  {
    icon: FileText,
    title: 'Notas e ideias',
    description: 'Guarde informações importantes e encontre depois sem perder tempo procurando.',
  },
  {
    icon: Search,
    title: 'Busca rápida',
    description: 'Encontre tarefas, contatos, eventos e notas de forma direta dentro da sua rotina.',
  },
] as const;

export const homeHighlights = [
  { icon: Clock, title: 'Menos esquecimentos', description: 'Tarefas e compromissos ficam visíveis no momento certo.' },
  { icon: ListTodo, title: 'Mais clareza', description: 'Sua rotina vira uma lista prática e fácil de acompanhar.' },
  { icon: Sparkles, title: 'Mais leveza', description: 'A Kiki cuida da organização para você focar no que importa.' },
] as const;

export const steps = [
  {
    title: 'Converse com a Kiki',
    description: 'Conte o que precisa organizar: reunião, compra, tarefa, lembrete ou ideia.',
  },
  {
    title: 'Ela estrutura sua rotina',
    description: 'A Kiki transforma informações soltas em ações claras, datas e prioridades.',
  },
  {
    title: 'Você acompanha tudo',
    description: 'Veja compromissos, tarefas e lembretes em uma experiência simples e responsiva.',
  },
] as const;

export const plans = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    description: 'Para começar a organizar o dia',
    cta: 'Criar conta grátis',
    featured: false,
    items: ['Notas básicas', 'Calendário básico', '10 conversas com IA/dia', '1 dispositivo'],
  },
  {
    name: 'Pro',
    price: 'R$ 29',
    description: 'Para profissionais',
    cta: 'Teste 14 dias grátis',
    featured: true,
    items: ['Notas ilimitadas', 'IA ilimitada com voz', 'Sincronização ilimitada', 'Análises avançadas', 'Integrações premium'],
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    description: 'Para empresas',
    cta: 'Falar com vendas',
    featured: false,
    items: ['Tudo do Pro', 'Workspaces compartilhados', 'SSO e controles admin', 'SLA garantido'],
  },
] as const;
