import {
  AlarmClock,
  Bot,
  Brain,
  Calendar,
  CalendarCheck,
  ClipboardList,
  Clock,
  FileText,
  ListTodo,
  MapPin,
  MessageCircle,
  Phone,
  Plane,
  Scissors,
  Search,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Zap,
} from 'lucide-react';

export const featureOverview = [
  {
    icon: Bot,
    color: 'from-purple-500 to-pink-500',
    title: 'Agentes Autônomos',
    description:
      'Passagens, comparativos de preço, contatos médicos, serviços locais e muito mais. Os agentes pesquisam por você em segundo plano.',
    href: '/agentes',
    cta: 'Conhecer agentes',
  },
  {
    icon: Calendar,
    color: 'from-blue-500 to-cyan-500',
    title: 'Agenda e Reuniões',
    description:
      'Organize sua semana, agende reuniões e bloqueie tempo focado. Kiki lembra de tudo e avisa na hora certa.',
    href: '/recursos',
    cta: 'Saiba mais',
  },
  {
    icon: MessageCircle,
    color: 'from-pink-500 to-rose-500',
    title: 'Chat com IA',
    description:
      'Converse naturalmente por texto ou voz. Kiki entende contexto e aprende suas preferências ao longo do tempo.',
    href: '/recursos',
    cta: 'Saiba mais',
  },
  {
    icon: Brain,
    color: 'from-green-500 to-emerald-500',
    title: 'IA Proativa',
    description:
      'Receba sugestões inteligentes baseadas no seu histórico e alertas no momento certo, sem precisar pedir.',
    href: '/recursos',
    cta: 'Saiba mais',
  },
] as const;

export const quickActions = [
  { icon: CalendarCheck, color: 'from-blue-500 to-cyan-500', label: 'Planejar semana' },
  { icon: ListTodo, color: 'from-purple-500 to-pink-500', label: 'Organizar meu dia' },
  { icon: ClipboardList, color: 'from-green-500 to-emerald-500', label: 'Agendar reunião' },
  { icon: AlarmClock, color: 'from-orange-500 to-yellow-500', label: 'Criar lembrete' },
] as const;

export const howSteps = [
  {
    title: 'Crie sua conta',
    description: 'Cadastro rápido, sem cartão de crédito. Comece a usar em segundos.',
  },
  {
    title: 'Converse com Kiki',
    description: 'Conte sobre sua rotina e deixe Kiki aprender suas preferências.',
  },
  {
    title: 'Viva organizado',
    description: 'Receba sugestões inteligentes e mantenha tudo sob controle.',
  },
] as const;

export const howCapabilities = [
  {
    icon: CalendarCheck,
    color: 'from-blue-500 to-cyan-500',
    title: 'Planeje sua semana',
    description: 'Visualize compromissos, bloqueie tempo focado e organize prioridades',
  },
  {
    icon: ListTodo,
    color: 'from-purple-500 to-pink-500',
    title: 'Organize o dia',
    description: 'Liste tarefas, defina prioridades e receba sugestões de ordem ideal',
  },
  {
    icon: MessageCircle,
    color: 'from-green-500 to-emerald-500',
    title: 'Converse com IA',
    description: 'Faça perguntas, peça sugestões e receba ajuda contextualizada',
  },
  {
    icon: FileText,
    color: 'from-orange-500 to-yellow-500',
    title: 'Capture ideias',
    description: 'Crie notas rápidas, adicione tags e encontre tudo facilmente',
  },
] as const;

export const agents = [
  {
    icon: Plane,
    color: 'from-blue-500 to-cyan-500',
    bg: 'from-blue-50 to-cyan-50',
    border: 'border-blue-100',
    tag: 'Viagens',
    title: 'Pesquisa de passagens aéreas',
    description:
      'Diga pra onde e quando quer ir. O agente varre as principais companhias e plataformas, filtra pelas suas preferências e apresenta as melhores opções com preço, escalas e horários.',
    example:
      '"Kiki, acha voos de SP pra Lisboa em outubro com preço até R$ 4.000, preferência por voo direto ou uma escala"',
    results: [
      'Compara 12+ companhias aéreas automaticamente',
      'Filtra por preço, horário e número de escalas',
      'Alerta quando o preço cair',
    ],
  },
  {
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-500',
    bg: 'from-green-50 to-emerald-50',
    border: 'border-green-100',
    tag: 'Compras',
    title: 'Comparativo de preços',
    description:
      'Antes de comprar qualquer produto, o agente pesquisa nas principais lojas, verifica avaliações, compara preços com e sem frete e encontra o melhor custo-benefício.',
    example:
      '"Compara o notebook novo em várias lojas online e me diz onde está mais barato com frete incluso pra minha cidade"',
    results: [
      'Pesquisa em dezenas de lojas simultaneamente',
      'Inclui frete no cálculo final',
      'Verifica reputação dos vendedores',
    ],
  },
  {
    icon: Stethoscope,
    color: 'from-purple-500 to-pink-500',
    bg: 'from-purple-50 to-pink-50',
    border: 'border-purple-100',
    tag: 'Saúde',
    title: 'Contatos médicos',
    description:
      'Precisa marcar uma consulta? O agente encontra especialistas próximos a você, verifica disponibilidade de agenda, planos aceitos e avaliações de pacientes.',
    example:
      '"Acha cardiologistas perto de Pinheiros que atendam convênio e tenham avaliação acima de 4 estrelas"',
    results: [
      'Filtra por especialidade, bairro e plano',
      'Verifica avaliações online',
      'Lista número de contato e endereço',
    ],
  },
  {
    icon: Scissors,
    color: 'from-orange-500 to-yellow-500',
    bg: 'from-orange-50 to-yellow-50',
    border: 'border-orange-100',
    tag: 'Serviços locais',
    title: 'Serviços perto de você',
    description:
      'Barbeiros, salões, academias, lavanderias, pet shops, mecânicas. O agente encontra o serviço que você precisa na sua região com avaliações reais e disponibilidade.',
    example:
      '"Encontra um barbeiro bem avaliado a até 2km de mim com horário disponível essa semana, e também uma lavanderia que pegue roupa a domicílio"',
    results: [
      'Barbeiros, salões, pet shops, academias e mais',
      'Horários e disponibilidade em tempo real',
      'Avaliações e distância exata',
    ],
  },
  {
    icon: Phone,
    color: 'from-pink-500 to-rose-500',
    bg: 'from-pink-50 to-rose-50',
    border: 'border-pink-100',
    tag: 'Contatos',
    title: 'Qualquer contato que você precisar',
    description:
      'Encanadores, eletricistas, tutores, professores particulares, advogados, consultores. Diga o que precisa e o agente descobre quem pode te ajudar na sua região.',
    example:
      '"Preciso de um eletricista de confiança em Campinas que faça instalação de tomadas 220V nesse fim de semana"',
    results: [
      'Busca em múltiplas plataformas',
      'Verifica avaliações e referências',
      'Entrega contato direto pronto pra ligar',
    ],
  },
  {
    icon: Zap,
    color: 'from-violet-500 to-indigo-500',
    bg: 'from-violet-50 to-indigo-50',
    border: 'border-violet-100',
    tag: 'Em breve',
    title: 'Muito mais chegando',
    description:
      'Os agentes da Kiki estão em constante evolução. Reservas em restaurantes, pesquisa de imóveis, monitoramento de preços, comparação de planos de saúde e muito mais.',
    example: 'A lista de agentes cresce a cada semana com base no que nossos usuários mais precisam.',
    results: ['Reservas em restaurantes', 'Pesquisa e alerta de imóveis', 'Monitoramento de preços 24/7'],
  },
] as const;

export const plans = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    description: 'Para começar',
    cta: 'Começar grátis',
    featured: false,
    checks: ['Até 50 notas', 'Calendário básico', '10 conversas com IA/dia', '1 dispositivo'],
  },
  {
    name: 'Pro',
    price: 'R$ 29',
    description: 'Para profissionais',
    cta: 'Teste 14 dias grátis',
    featured: true,
    checks: [
      'Notas ilimitadas',
      'IA ilimitada com voz',
      'Sincronização ilimitada',
      'Análises avançadas',
      'Integrações premium',
      'Suporte prioritário',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Personalizado',
    description: 'Para empresas',
    cta: 'Falar com vendas',
    featured: false,
    checks: ['Tudo do Pro', 'Workspaces compartilhados', 'SSO e controles admin', 'SLA garantido', 'Onboarding dedicado'],
  },
] as const;

export const pricingFaqs = [
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim! Sem contratos longos ou taxas de cancelamento. Você pode cancelar sua assinatura quando quiser.',
  },
  {
    question: 'O teste grátis requer cartão de crédito?',
    answer: 'Não! Você pode testar o plano Pro por 14 dias sem informar dados de pagamento.',
  },
  {
    question: 'Posso mudar de plano depois?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento.',
  },
] as const;

export const agentStatusCards = [
  {
    icon: Plane,
    color: 'from-blue-500 to-cyan-500',
    title: 'Passagens aéreas',
    desc: 'Busca nas principais companhias e traz as melhores opções',
    status: 'Pesquisando...',
    statusColor: 'text-blue-300',
    dot: 'bg-blue-400 animate-pulse',
  },
  {
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-500',
    title: 'Comparativo de preços',
    desc: 'Compara produto em dezenas de lojas com frete incluso',
    status: 'Concluído',
    statusColor: 'text-green-300',
    dot: 'bg-green-400',
  },
  {
    icon: MapPin,
    color: 'from-purple-500 to-pink-500',
    title: 'Serviços e contatos',
    desc: 'Encontra médicos, barbeiros e prestadores perto de você',
    status: 'Concluído',
    statusColor: 'text-green-300',
    dot: 'bg-green-400',
  },
] as const;

export const featureIcons = {
  AlarmClock,
  Bot,
  Brain,
  Calendar,
  CalendarCheck,
  Clock,
  FileText,
  ListTodo,
  MapPin,
  MessageCircle,
  Plane,
  Search,
  ShoppingCart,
  Sparkles,
  Stethoscope,
};
