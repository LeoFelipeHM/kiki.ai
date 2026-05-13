import { Sparkles, Calendar, MessageCircle, FileText, Menu, X, ArrowRight, Star, Brain, Clock, Search, CalendarCheck, ListTodo, ClipboardList, AlarmClock, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/navigation/routes';
import logoMark from '@/logo.svg';
import {
  cardStaggerContainer,
  cardStaggerItem,
  heroContainer,
  heroItem,
  inViewSoft,
  pageCrossfade,
} from './landingMotion';

type Page = 'home' | 'features' | 'how' | 'pricing' | 'signup';

export default function App() {
  const routerNavigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const goToLogin = useCallback(() => {
    setMobileMenuOpen(false);
    routerNavigate(ROUTES.login);
  }, [routerNavigate]);

  /** Sempre do topo ao carregar / F5; evita o browser restaurar scroll antigo */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const { history } = window;
    if (history && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  /** Após trocar Recursos / Como funciona / Preços (etc.), o scroll corre no fim do layout — evita ficar no meio da página */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentPage]);

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100"
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.button
              type="button"
              onClick={() => navigateTo('home')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                src={logoMark}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain shrink-0"
                decoding="async"
              />
              <span className="text-xl font-semibold">Kiki</span>
            </motion.button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigateTo('features')}
                className={`px-4 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors ${
                  currentPage === 'features' ? 'text-gray-900 bg-gray-50' : 'text-gray-700'
                }`}
              >
                Recursos
              </button>
              <button
                onClick={() => navigateTo('how')}
                className={`px-4 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors ${
                  currentPage === 'how' ? 'text-gray-900 bg-gray-50' : 'text-gray-700'
                }`}
              >
                Como funciona
              </button>
              <button
                onClick={() => navigateTo('pricing')}
                className={`px-4 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors ${
                  currentPage === 'pricing' ? 'text-gray-900 bg-gray-50' : 'text-gray-700'
                }`}
              >
                Preços
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <button
                type="button"
                onClick={goToLogin}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Entrar
              </button>
              <button onClick={() => navigateTo('signup')} className="px-5 py-2 text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:shadow-lg transition-all">
                Começar grátis
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation */}
      <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              key="mobile-nav"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden border-t border-gray-100"
            >
              <div className="py-4 flex flex-col gap-1">
                <button onClick={() => navigateTo('features')} className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                  Recursos
                </button>
                <button onClick={() => navigateTo('how')} className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                  Como funciona
                </button>
                <button onClick={() => navigateTo('pricing')} className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left">
                  Preços
                </button>
                <div className="mt-4 px-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="px-5 py-2.5 text-sm text-center text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50"
                  >
                    Entrar
                  </button>
                  <button onClick={() => navigateTo('signup')} className="px-5 py-2.5 text-sm text-center text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
                    Começar grátis
                  </button>
                </div>
              </div>
            </motion.nav>
          )}
      </AnimatePresence>
        </div>
      </motion.header>

      {/* Page Content */}
      <AnimatePresence mode="wait">
        {currentPage === 'home' && (
          <motion.div key="home" {...pageCrossfade}>
            <HomePage navigateTo={navigateTo} />
          </motion.div>
        )}
        {currentPage === 'features' && (
          <motion.div key="features" {...pageCrossfade}>
            <FeaturesPage navigateTo={navigateTo} />
          </motion.div>
        )}
        {currentPage === 'how' && (
          <motion.div key="how" {...pageCrossfade}>
            <HowItWorksPage navigateTo={navigateTo} />
          </motion.div>
        )}
        {currentPage === 'pricing' && (
          <motion.div key="pricing" {...pageCrossfade}>
            <PricingPage navigateTo={navigateTo} />
          </motion.div>
        )}
        {currentPage === 'signup' && (
          <motion.div key="signup" {...pageCrossfade}>
            <SignupPage navigateTo={navigateTo} goToLogin={goToLogin} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer className="py-8 md:py-12 px-4 md:px-6 bg-white border-t border-gray-100" {...inViewSoft}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
            <div className="col-span-2 md:col-span-1">
              <button onClick={() => navigateTo('home')} className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 hover:opacity-80 transition-opacity">
                <img
                  src={logoMark}
                  alt=""
                  width={32}
                  height={32}
                  className="h-7 w-7 md:h-8 md:w-8 rounded-lg object-contain shrink-0"
                  decoding="async"
                />
                <span className="text-lg md:text-xl font-semibold text-gray-900">Kiki</span>
              </button>
              <p className="text-xs md:text-sm text-gray-600">
                Seu assistente pessoal inteligente
              </p>
            </div>

            <div>
              <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-900">Produto</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600">
                <li><button onClick={() => navigateTo('features')} className="hover:text-gray-900">Recursos</button></li>
                <li><button onClick={() => navigateTo('pricing')} className="hover:text-gray-900">Preços</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-gray-900">Integrações</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-900">Empresa</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600">
                <li><button onClick={() => navigateTo('home')} className="hover:text-gray-900">Sobre</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-gray-900">Blog</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-gray-900">Contato</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-900">Legal</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600">
                <li><button onClick={() => navigateTo('home')} className="hover:text-gray-900">Privacidade</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-gray-900">Termos</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-gray-900">Segurança</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 md:pt-8 border-t border-gray-100 text-center">
            <p className="text-xs md:text-sm text-gray-600">
              © 2026 Kiki. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

// Home Page
function HomePage({ navigateTo }: { navigateTo: (page: Page) => void }) {
  return (
    <>
      {/* Hero Section */}
      <motion.section className="pt-24 md:pt-32 pb-12 md:pb-16 px-4 md:px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={heroContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.45 }}
        >
          <motion.div
            variants={heroItem}
            className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 bg-purple-50 rounded-full mb-4 md:mb-6"
          >
            <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-600" />
            <span className="text-xs md:text-sm font-medium text-purple-900">Organize sua vida com IA</span>
          </motion.div>

          <motion.h1
            variants={heroItem}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 tracking-tight text-gray-900 leading-[1.1] px-2"
          >
            Seu assistente pessoal
            <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
              inteligente para o dia a dia
            </span>
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="text-base md:text-lg lg:text-xl text-gray-600 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4"
          >
            Kiki aprende com você e ajuda a gerenciar tarefas, eventos e notas de forma natural. Mais produtividade, menos estresse.
          </motion.p>
        </motion.div>
      </motion.section>

      {/* Interactive Demo Section */}
      <motion.section className="pb-16 md:pb-20 px-4 md:px-6" {...inViewSoft}>
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl md:rounded-3xl p-4 md:p-8 lg:p-12 border border-gray-200">
            {/* Search Bar */}
            <div className="mb-4 md:mb-6">
              <button
                onClick={() => navigateTo('signup')}
                className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 bg-white rounded-xl md:rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all group"
              >
                <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                <span className="text-sm md:text-base text-gray-500 group-hover:text-gray-900 transition-colors flex-1 text-left">
                  Pergunte qualquer coisa para Kiki...
                </span>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <span className="text-xs text-gray-500">Enter</span>
                </div>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <button
                onClick={() => navigateTo('signup')}
                className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 bg-white rounded-lg md:rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">Planejar semana</span>
              </button>

              <button
                onClick={() => navigateTo('signup')}
                className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 bg-white rounded-lg md:rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ListTodo className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">Organizar meu dia</span>
              </button>

              <button
                onClick={() => navigateTo('signup')}
                className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 bg-white rounded-lg md:rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">Agendar reunião</span>
              </button>

              <button
                onClick={() => navigateTo('signup')}
                className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 bg-white rounded-lg md:rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlarmClock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">Criar lembrete</span>
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Features Overview Section */}
      <motion.section className="py-12 md:py-20 px-4 md:px-6 bg-gray-50" {...inViewSoft}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-gray-900 px-4">
              Tudo que você precisa em um lugar
            </h2>
            <p className="text-base md:text-lg text-gray-600">
              Recursos inteligentes que trabalham juntos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            <div className="bg-white rounded-xl md:rounded-2xl p-6 md:p-8 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 md:mb-4">
                <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Chat com IA</h3>
              <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                Converse naturalmente por texto ou voz. Kiki entende contexto e aprende suas preferências.
              </p>
              <button onClick={() => navigateTo('features')} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2">
                Saiba mais <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-6 md:p-8 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 md:mb-4">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Calendário e Notas</h3>
              <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                Organize eventos, tarefas e notas em múltiplas visualizações. Tudo sincronizado e protegido.
              </p>
              <button onClick={() => navigateTo('features')} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2">
                Saiba mais <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-6 md:p-8 border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 md:mb-4">
                <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">IA Proativa</h3>
              <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                Receba sugestões inteligentes baseadas no seu histórico e alertas no momento certo.
              </p>
              <button onClick={() => navigateTo('features')} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2">
                Saiba mais <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section className="py-12 md:py-20 px-4 md:px-6" {...inViewSoft}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-gray-900 px-4">
              Simples de começar
            </h2>
            <p className="text-base md:text-lg text-gray-600">
              Configure em minutos e veja a diferença na sua rotina
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 md:mb-6 text-white text-xl md:text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Crie sua conta</h3>
              <p className="text-sm md:text-base text-gray-600 px-4">
                Cadastro rápido, sem cartão de crédito
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 md:mb-6 text-white text-xl md:text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Converse com Kiki</h3>
              <p className="text-sm md:text-base text-gray-600 px-4">
                Conte sobre sua rotina e deixe Kiki aprender
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 md:mb-6 text-white text-xl md:text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Viva organizado</h3>
              <p className="text-sm md:text-base text-gray-600 px-4">
                Receba sugestões inteligentes e mantenha tudo sob controle
              </p>
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => navigateTo('how')} className="text-purple-600 hover:text-purple-700 font-medium text-sm md:text-base flex items-center gap-2 mx-auto">
              Ver mais detalhes <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section className="py-12 md:py-20 px-4 md:px-6 bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700" {...inViewSoft}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 px-4">
            Pronto para se organizar?
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-purple-100 mb-8 md:mb-10 max-w-2xl mx-auto px-4">
            Junte-se a milhares de pessoas que já estão vivendo com mais foco e menos estresse
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
            <button onClick={() => navigateTo('signup')} className="px-6 md:px-8 py-3 md:py-4 bg-white text-purple-600 rounded-full font-semibold hover:bg-gray-50 transition-colors text-base md:text-lg">
              Começar grátis
            </button>
            <button onClick={() => navigateTo('features')} className="px-6 md:px-8 py-3 md:py-4 border-2 border-white/30 text-white rounded-full font-semibold hover:bg-white/10 transition-colors text-base md:text-lg">
              Ver todos os recursos
            </button>
          </div>
        </div>
      </motion.section>
    </>
  );
}

// Features Page
function FeaturesPage({ navigateTo }: { navigateTo: (page: Page) => void }) {
  return (
    <motion.section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6" {...inViewSoft}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 text-gray-900 px-2">
            Recursos poderosos para sua rotina
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Tudo que você precisa para organizar tarefas, eventos e notas em um só lugar
          </p>
        </div>

        <motion.div
          variants={cardStaggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.12 }}
        >
          {/* Feature 1: Chat com IA */}
          <motion.div
            variants={cardStaggerItem}
            className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center mb-12 md:mb-20"
          >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full mb-3 md:mb-4">
              <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-600" />
              <span className="text-xs md:text-sm font-medium text-purple-900">Conversa Natural</span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 md:mb-6 text-gray-900">
              Fale com Kiki como fala com um amigo
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-4 md:mb-6 leading-relaxed">
              Chat de texto e voz que entende contexto. Kiki aprende suas preferências e antecipa o que você precisa.
            </p>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Respostas contextualizadas e inteligentes</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Comandos de voz para hands-free</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Histórico completo de conversas</span>
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 border border-purple-100">
              <div className="space-y-3 md:space-y-4">
                <div className="flex gap-2 md:gap-3 items-start">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div className="flex-1 bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm">
                    <p className="text-xs md:text-sm text-gray-700">Como posso organizar melhor minha semana?</p>
                  </div>
                </div>
                <div className="flex gap-2 md:gap-3 items-start flex-row-reverse">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs md:text-sm font-medium">Você</span>
                  </div>
                  <div className="flex-1 bg-purple-600 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm">
                    <p className="text-xs md:text-sm text-white">Posso te ajudar! Vejo que você tem 3 reuniões importantes. Sugiro bloquear terças e quintas das 9h-12h para trabalho focado.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature 2: Calendário */}
        <motion.div
          variants={cardStaggerItem}
          className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center mb-12 md:mb-20"
        >
          <div className="order-2 md:order-1 relative">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 border border-blue-100">
              <div className="space-y-2 md:space-y-3">
                <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-blue-200">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">Reunião de planejamento</p>
                      <p className="text-xs text-gray-500">Hoje, 14:00 - 15:30</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-purple-200">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">Ideias para projeto Q2</p>
                      <p className="text-xs text-gray-500">Atualizado há 2h</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-green-200">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">Review de código - João</p>
                      <p className="text-xs text-gray-500">Amanhã, 10:00</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full mb-3 md:mb-4">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
              <span className="text-xs md:text-sm font-medium text-blue-900">Tudo Organizado</span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 md:mb-6 text-gray-900">
              Calendário e notas trabalhando juntos
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-4 md:mb-6 leading-relaxed">
              Visualize eventos, tarefas e notas em um só lugar. Organize por categorias, adicione tags e encontre tudo rapidamente.
            </p>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Múltiplas visualizações (dia, semana, mês)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Notas com tags e busca avançada</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Proteção de notas sensíveis</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Feature 3: IA Proativa */}
        <motion.div
          variants={cardStaggerItem}
          className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center mb-10 md:mb-16"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full mb-3 md:mb-4">
              <Brain className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
              <span className="text-xs md:text-sm font-medium text-green-900">Inteligência Proativa</span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 md:mb-6 text-gray-900">
              Sugestões antes mesmo de você pedir
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-4 md:mb-6 leading-relaxed">
              Kiki analisa seus padrões e sugere a melhor forma de organizar seu tempo. Lembretes inteligentes no momento certo.
            </p>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Sugestões baseadas no seu histórico</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Alertas contextuais e oportunos</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                </div>
                <span className="text-sm md:text-base text-gray-700">Análises de produtividade</span>
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 border border-green-100">
              <div className="space-y-3 md:space-y-4">
                <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border-l-4 border-green-500">
                  <div className="flex items-start gap-2 md:gap-3">
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900 mb-1">Sugestão de Kiki</p>
                      <p className="text-xs md:text-sm text-gray-600">Você tem 2h livres amanhã de manhã. Que tal focar naquele relatório?</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border-l-4 border-blue-500">
                  <div className="flex items-start gap-2 md:gap-3">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900 mb-1">Lembrete</p>
                      <p className="text-xs md:text-sm text-gray-600">Sua reunião começa em 15 minutos</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border-l-4 border-purple-500">
                  <div className="flex items-start gap-2 md:gap-3">
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900 mb-1">Insight</p>
                      <p className="text-xs md:text-sm text-gray-600">Você é 40% mais produtivo nas terças pela manhã</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={cardStaggerItem} className="text-center">
          <button onClick={() => navigateTo('signup')} className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-lg transition-all text-base md:text-lg">
            Começar a usar Kiki
          </button>
        </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}

// How It Works Page
function HowItWorksPage({ navigateTo }: { navigateTo: (page: Page) => void }) {
  return (
    <motion.section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6" {...inViewSoft}>
      <div className="max-w-4xl mx-auto text-center mb-10 md:mb-16">
        <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 text-gray-900 px-2">
          Comece em minutos
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-gray-600 px-4">
          Configure Kiki rapidamente e veja a diferença na sua rotina
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        <motion.div
          variants={cardStaggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
          className="grid md:grid-cols-3 gap-6 md:gap-8 mb-10 md:mb-16"
        >
          <motion.div variants={cardStaggerItem} className="text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 md:mb-6 text-white text-xl md:text-2xl font-bold">
              1
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Crie sua conta</h3>
            <p className="text-sm md:text-base text-gray-600 px-4">
              Cadastro rápido, sem cartão de crédito. Comece a usar em segundos.
            </p>
          </motion.div>

          <motion.div variants={cardStaggerItem} className="text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 md:mb-6 text-white text-xl md:text-2xl font-bold">
              2
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Converse com Kiki</h3>
            <p className="text-sm md:text-base text-gray-600 px-4">
              Conte sobre sua rotina e deixe Kiki aprender suas preferências.
            </p>
          </motion.div>

          <motion.div variants={cardStaggerItem} className="text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 md:mb-6 text-white text-xl md:text-2xl font-bold">
              3
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-gray-900">Viva organizado</h3>
            <p className="text-sm md:text-base text-gray-600 px-4">
              Receba sugestões inteligentes e mantenha tudo sob controle.
            </p>
          </motion.div>
        </motion.div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12 border border-gray-200 mb-10 md:mb-16">
          <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900 text-center">O que você pode fazer com Kiki</h3>
          <motion.div
            variants={cardStaggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.18 }}
            className="grid md:grid-cols-2 gap-4 md:gap-6"
          >
            <motion.div variants={cardStaggerItem} className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-200">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 md:mb-4">
                <CalendarCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">Planeje sua semana</h4>
              <p className="text-xs md:text-sm text-gray-600">Visualize compromissos, bloqueie tempo focado e organize prioridades</p>
            </motion.div>

            <motion.div variants={cardStaggerItem} className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-200">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 md:mb-4">
                <ListTodo className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">Organize o dia</h4>
              <p className="text-xs md:text-sm text-gray-600">Liste tarefas, defina prioridades e receba sugestões de ordem ideal</p>
            </motion.div>

            <motion.div variants={cardStaggerItem} className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-200">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 md:mb-4">
                <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">Converse com IA</h4>
              <p className="text-xs md:text-sm text-gray-600">Faça perguntas, peça sugestões e receba ajuda contextualizada</p>
            </motion.div>

            <motion.div variants={cardStaggerItem} className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-200">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center mb-3 md:mb-4">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">Capture ideias</h4>
              <p className="text-xs md:text-sm text-gray-600">Crie notas rápidas, adicione tags e encontre tudo facilmente</p>
            </motion.div>
          </motion.div>
        </div>

        <div className="text-center">
          <button onClick={() => navigateTo('signup')} className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-lg transition-all text-base md:text-lg">
            Criar conta grátis
          </button>
        </div>
      </div>
    </motion.section>
  );
}

// Pricing Page
function PricingPage({ navigateTo }: { navigateTo: (page: Page) => void }) {
  return (
    <motion.section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6" {...inViewSoft}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 text-gray-900 px-2">
            Escolha seu plano
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-600">
            Comece grátis e evolua quando precisar
          </p>
        </div>

        <motion.div
          variants={cardStaggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto mb-10 md:mb-16"
        >
          <motion.div
            variants={cardStaggerItem}
            className="border border-gray-200 rounded-2xl md:rounded-3xl p-6 md:p-8 bg-white transition-all duration-300 ease-out hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-gray-900/8"
          >
            <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-gray-900">Grátis</h3>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Para começar</p>
            <div className="mb-4 md:mb-6">
              <span className="text-4xl md:text-5xl font-bold text-gray-900">R$ 0</span>
              <span className="text-sm md:text-base text-gray-600">/mês</span>
            </div>
            <button onClick={() => navigateTo('signup')} className="block w-full py-2.5 md:py-3 px-6 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-medium transition-colors mb-4 md:mb-6 text-sm md:text-base">
              Começar grátis
            </button>
            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                Até 50 notas
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                Calendário básico
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                10 conversas com IA/dia
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                1 dispositivo
              </li>
            </ul>
          </motion.div>

          <motion.div
            variants={cardStaggerItem}
            className="border-2 border-purple-600 rounded-2xl md:rounded-3xl p-6 md:p-8 relative bg-white shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-600/25 hover:border-purple-500"
          >
            <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs md:text-sm font-medium rounded-full">
              Recomendado
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-gray-900">Pro</h3>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Para profissionais</p>
            <div className="mb-4 md:mb-6">
              <span className="text-4xl md:text-5xl font-bold text-gray-900">R$ 29</span>
              <span className="text-sm md:text-base text-gray-600">/mês</span>
            </div>
            <button onClick={() => navigateTo('signup')} className="block w-full py-2.5 md:py-3 px-6 text-center bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg text-white rounded-full font-medium transition-all mb-4 md:mb-6 text-sm md:text-base">
              Teste 14 dias grátis
            </button>
            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                Notas ilimitadas
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                IA ilimitada com voz
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                Sincronização ilimitada
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                Análises avançadas
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                Integrações premium
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                Suporte prioritário
              </li>
            </ul>
          </motion.div>

          <motion.div
            variants={cardStaggerItem}
            className="border border-gray-200 rounded-2xl md:rounded-3xl p-6 md:p-8 bg-white transition-all duration-300 ease-out hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-gray-900/8"
          >
            <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-gray-900">Enterprise</h3>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Para empresas</p>
            <div className="mb-4 md:mb-6">
              <span className="text-2xl md:text-3xl font-bold text-gray-900">Personalizado</span>
            </div>
            <button onClick={() => navigateTo('signup')} className="block w-full py-2.5 md:py-3 px-6 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-medium transition-colors mb-4 md:mb-6 text-sm md:text-base">
              Falar com vendas
            </button>
            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                Tudo do Pro
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                Workspaces compartilhados
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                SSO e controles admin
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                SLA garantido
              </li>
              <li className="flex items-center gap-2 md:gap-3 text-gray-700">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
                Onboarding dedicado
              </li>
            </ul>
          </motion.div>
        </motion.div>

        <div className="text-center mb-8 md:mb-12">
          <p className="text-xs md:text-sm text-gray-600 mb-6 md:mb-8 px-4">
            Todos os planos incluem: Segurança de dados, Suporte técnico, Atualizações gratuitas
          </p>
        </div>

        {/* FAQ Pricing */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-900 text-center px-4">Perguntas frequentes</h2>
          <motion.div
            variants={cardStaggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-4 md:space-y-6"
          >
            <motion.div
              variants={cardStaggerItem}
              className="bg-white border border-gray-200 rounded-xl md:rounded-2xl p-4 md:p-6"
            >
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-gray-600 text-xs md:text-sm">Sim! Sem contratos longos ou taxas de cancelamento. Você pode cancelar sua assinatura quando quiser.</p>
            </motion.div>
            <motion.div
              variants={cardStaggerItem}
              className="bg-white border border-gray-200 rounded-xl md:rounded-2xl p-4 md:p-6"
            >
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">O teste grátis requer cartão de crédito?</h3>
              <p className="text-gray-600 text-xs md:text-sm">Não! Você pode testar o plano Pro por 14 dias sem informar dados de pagamento.</p>
            </motion.div>
            <motion.div
              variants={cardStaggerItem}
              className="bg-white border border-gray-200 rounded-xl md:rounded-2xl p-4 md:p-6"
            >
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Posso mudar de plano depois?</h3>
              <p className="text-gray-600 text-xs md:text-sm">Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

// Signup Page
function SignupPage({
  navigateTo,
  goToLogin,
}: {
  navigateTo: (page: Page) => void;
  goToLogin: () => void;
}) {
  return (
    <motion.section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 bg-gray-50 min-h-screen" {...inViewSoft}>
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm">
          <div className="text-center mb-6 md:mb-8">
            <img
              src={logoMark}
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-xl object-contain mx-auto mb-3 md:mb-4"
              decoding="async"
            />
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">Crie sua conta</h2>
            <p className="text-sm md:text-base text-gray-600">Comece grátis, sem cartão de crédito</p>
          </div>

          <form className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-gray-700">Nome completo</label>
              <input
                type="text"
                placeholder="Seu nome"
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm md:text-base"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-gray-700">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm md:text-base"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-gray-700">Senha</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm md:text-base"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg md:rounded-xl font-semibold hover:shadow-lg transition-all text-sm md:text-base"
            >
              Criar conta grátis
            </button>

            <p className="text-center text-xs md:text-sm text-gray-600">
              Já tem uma conta?{' '}
              <button type="button" onClick={goToLogin} className="text-purple-600 hover:text-purple-700 font-medium">
                Entrar
              </button>
            </p>
          </form>

          <div className="mt-5 md:mt-6 pt-5 md:pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500 leading-relaxed">
              Ao criar uma conta, você concorda com nossos{' '}
              <button type="button" onClick={() => navigateTo('home')} className="text-purple-600 hover:underline">
                Termos de Uso
              </button>{' '}
              e{' '}
              <button type="button" onClick={() => navigateTo('home')} className="text-purple-600 hover:underline">
                Política de Privacidade
              </button>
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
