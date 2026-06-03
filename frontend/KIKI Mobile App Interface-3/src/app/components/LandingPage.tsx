import { Sparkles, Calendar, MessageCircle, FileText, Shield, Zap, Clock, Target, Users, Check, ArrowRight, Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface LandingPageProps {
  onStartApp?: () => void;
}

export function LandingPage({ onStartApp }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: MessageCircle,
      title: 'Assistente com IA',
      description: 'Converse naturalmente com Kiki e receba sugestões inteligentes para seu dia.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Calendar,
      title: 'Calendário Inteligente',
      description: 'Organize eventos, tarefas e compromissos com visualizações dinâmicas.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: FileText,
      title: 'Notas Poderosas',
      description: 'Capture ideias com tags, proteção e busca avançada.',
      color: 'from-pink-500 to-purple-500',
    },
    {
      icon: Sparkles,
      title: 'Sugestões Proativas',
      description: 'Kiki antecipa suas necessidades e oferece insights personalizados.',
      color: 'from-orange-500 to-yellow-500',
    },
    {
      icon: Shield,
      title: 'Seguro e Privado',
      description: 'Seus dados protegidos com criptografia de ponta a ponta.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Zap,
      title: 'Rápido e Fluido',
      description: 'Interface otimizada com animações suaves e respostas instantâneas.',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'Economize 2 horas por dia',
      description: 'Automatize tarefas repetitivas e foque no que realmente importa.',
    },
    {
      icon: Target,
      title: 'Atinja suas metas',
      description: 'Acompanhamento inteligente de objetivos e progresso.',
    },
    {
      icon: Users,
      title: 'Para todos os estilos',
      description: 'Adapta-se ao seu jeito único de trabalhar e viver.',
    },
  ];

  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Gerente de Projetos',
      avatar: 'MS',
      text: 'Kiki mudou completamente como organizo meu dia. Nunca mais perco reuniões importantes!',
      rating: 5,
    },
    {
      name: 'Pedro Santos',
      role: 'Empreendedor',
      avatar: 'PS',
      text: 'A melhor ferramenta de produtividade que já usei. A IA realmente entende minhas necessidades.',
      rating: 5,
    },
    {
      name: 'Ana Costa',
      role: 'Estudante',
      avatar: 'AC',
      text: 'Consigo equilibrar estudos, trabalho e vida pessoal sem estresse. Kiki é incrível!',
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: 'Grátis',
      price: 'R$ 0',
      period: '/mês',
      description: 'Para começar sua jornada',
      features: [
        'Até 50 notas',
        'Calendário básico',
        '10 conversas com IA/dia',
        'Sincronização 1 dispositivo',
      ],
      cta: 'Começar Grátis',
      popular: false,
    },
    {
      name: 'Pro',
      price: 'R$ 29',
      period: '/mês',
      description: 'Para produtividade máxima',
      features: [
        'Notas ilimitadas',
        'Calendário inteligente',
        'IA ilimitada',
        'Sincronização ilimitada',
        'Integrações premium',
        'Suporte prioritário',
        'Análises avançadas',
      ],
      cta: 'Começar Teste Grátis',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Personalizado',
      period: '',
      description: 'Para times e empresas',
      features: [
        'Tudo do Pro',
        'Workspaces de equipe',
        'SSO e controles admin',
        'SLA garantido',
        'Onboarding dedicado',
        'API customizada',
      ],
      cta: 'Falar com Vendas',
      popular: false,
    },
  ];

  const faqs = [
    {
      question: 'Como a IA da Kiki funciona?',
      answer: 'Kiki usa modelos de linguagem avançados para entender seu contexto, aprender suas preferências e oferecer sugestões personalizadas. Quanto mais você usa, mais inteligente ela fica.',
    },
    {
      question: 'Meus dados estão seguros?',
      answer: 'Sim! Todos os dados são criptografados de ponta a ponta. Não vendemos nem compartilhamos suas informações. Você tem controle total sobre seus dados.',
    },
    {
      question: 'Posso usar em múltiplos dispositivos?',
      answer: 'Sim! O plano Pro permite sincronização automática entre todos seus dispositivos - celular, tablet, computador.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer: 'Claro! Sem contratos ou taxas de cancelamento. Você pode cancelar sua assinatura quando quiser.',
    },
    {
      question: 'Tem teste grátis?',
      answer: 'Sim! O plano Pro oferece 14 dias de teste grátis, sem necessidade de cartão de crédito.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">KIKI</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funcionalidades
              </a>
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Benefícios
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Preços
              </a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </a>
              <button
                onClick={onStartApp}
                className="px-6 py-2.5 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full btn-apple-gradient shadow-lg text-sm font-medium"
              >
                Começar Grátis
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center btn-apple"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Funcionalidades
                </a>
                <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Benefícios
                </a>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Preços
                </a>
                <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </a>
                <button
                  onClick={onStartApp}
                  className="px-6 py-2.5 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full btn-apple-gradient shadow-lg text-sm font-medium"
                >
                  Começar Grátis
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-pink-500/5 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full mb-8 border border-purple-500/20">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Seu copiloto para a vida diária</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            Organize sua vida com
            <span className="block bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Inteligência Artificial
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Kiki é sua assistente pessoal com IA que transforma como você gerencia tarefas, eventos e notas.
            Mais tempo para o que importa, menos estresse no dia a dia.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={onStartApp}
              className="px-8 py-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full btn-apple-gradient shadow-xl text-base font-semibold flex items-center gap-2 group"
            >
              Começar Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white border-2 border-border text-foreground rounded-full btn-apple shadow-md text-base font-semibold hover:border-purple-500/50 transition-colors">
              Ver Demo
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Teste grátis por 14 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>

        {/* App Preview */}
        <div className="max-w-md mx-auto mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur-3xl opacity-20" />
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-border">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 px-6 py-8 text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Bom dia, Maria!</h3>
              <p className="text-white/80 text-sm">Segunda-feira, 28 de Abril</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Reunião com equipe</p>
                    <p className="text-xs text-orange-600 font-medium">Começa em 15 min</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Ideias para o projeto</p>
                    <p className="text-xs text-muted-foreground">3 anotações</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tudo que você precisa em um só lugar</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas que trabalham juntas para simplificar sua rotina
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-border card-apple group hover:border-purple-500/30 transition-all"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Por que escolher Kiki?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Mais do que um organizador, uma parceira para sua produtividade
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Amado por milhares de usuários</h2>
            <p className="text-xl text-muted-foreground">
              Veja o que nossos usuários estão dizendo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 border border-border card-apple">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planos para todos os perfis</h2>
            <p className="text-xl text-muted-foreground">
              Comece grátis, escale quando precisar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 border-2 transition-all ${
                  plan.popular
                    ? 'border-purple-500 shadow-xl scale-105 relative'
                    : 'border-border card-apple'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-full">
                    Mais Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>

                <button
                  className={`w-full py-3 rounded-xl font-semibold mb-6 transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white btn-apple-gradient shadow-lg'
                      : 'bg-muted hover:bg-muted/80 btn-apple'
                  }`}
                >
                  {plan.cta}
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Perguntas Frequentes</h2>
            <p className="text-xl text-muted-foreground">
              Tudo que você precisa saber sobre Kiki
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="bg-white rounded-2xl p-6 border border-border card-apple group"
              >
                <summary className="font-semibold cursor-pointer flex items-center justify-between">
                  {faq.question}
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-muted-foreground mt-4 leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

            <div className="relative">
              <Sparkles className="w-16 h-16 mx-auto mb-6" />
              <h2 className="text-4xl font-bold mb-4">
                Pronto para transformar sua rotina?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Junte-se a milhares de pessoas que já estão vivendo com mais organização e menos estresse
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onStartApp}
                  className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all btn-apple text-base"
                >
                  Começar Grátis Agora
                </button>
                <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-full font-semibold hover:bg-white/20 transition-all btn-apple text-base">
                  Agendar Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">KIKI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sua assistente inteligente para a vida diária
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrações</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Kiki. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
