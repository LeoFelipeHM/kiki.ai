import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Sparkles,
  Star,
  Stethoscope,
} from 'lucide-react';
import { dashboardRoutes, publicRoutes } from './routes';
import { ReactiveHeader } from './ReactiveHeader';

const footerProductLinks: Array<[string, string]> = publicRoutes
  .filter((route) => ['/agentes', '/recursos', '/como-funciona', '/precos'].includes(route.href))
  .map((route) => [route.label, route.href]);

const footerCompanyLinks: Array<[string, string]> = [
  ['Blog', '/blog'],
  ['Contato', '/'],
];

const footerLegalLinks: Array<[string, string]> = publicRoutes
  .filter((route) => ['/privacidade', '/termos', '/seguranca'].includes(route.href))
  .map((route) => [route.label, route.href]);

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6">
          <div className="md:flex md:justify-start">
            <BrandLogo href="/" />
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            {publicRoutes.slice(1, 5).map((route) => {
              const isAgents = route.href === '/agentes';
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                    isAgents
                      ? 'text-purple-600 hover:bg-purple-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isAgents ? <Bot className="w-3.5 h-3.5" aria-hidden="true" /> : null}
                  {route.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center justify-end gap-3">
            <Link
              href={dashboardRoutes.login}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href={dashboardRoutes.signup}
              className="px-5 py-2 text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:shadow-lg transition-all"
            >
              Começar grátis
            </Link>
          </div>

          <details className="md:hidden relative">
            <summary className="list-none p-2 text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer">
              <span className="block h-5 w-5" aria-hidden="true">
                <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
                <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
                <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
              </span>
              <span className="sr-only">Abrir menu</span>
            </summary>
            <nav className="absolute right-0 mt-3 w-56 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl public-scale-in">
              {publicRoutes.slice(1, 5).map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm rounded-xl ${
                    route.href === '/agentes'
                      ? 'text-purple-600 hover:bg-purple-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {route.href === '/agentes' ? <Bot className="w-4 h-4" aria-hidden="true" /> : null}
                  {route.label}
                </Link>
              ))}
              <Link href={dashboardRoutes.login} className="block px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-gray-50">
                Entrar
              </Link>
              <Link href={dashboardRoutes.signup} className="block px-4 py-3 text-sm text-purple-700 rounded-xl hover:bg-purple-50">
                Começar grátis
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="py-8 md:py-12 px-4 md:px-6 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo href="/" className="mb-3 md:mb-4" />
            <p className="text-xs md:text-sm text-gray-600">Seu assistente pessoal inteligente</p>
          </div>
          <FooterGroup title="Produto" links={footerProductLinks} highlightFirst />
          <FooterGroup title="Empresa" links={footerCompanyLinks} />
          <FooterGroup title="Legal" links={footerLegalLinks} />
        </div>
        <div className="pt-6 md:pt-8 border-t border-gray-100 text-center">
          <p className="text-xs md:text-sm text-gray-600">© 2026 Kiki. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

export function BrandLogo({ href, className = '' }: { href: string; className?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity ${className}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white md:h-9 md:w-9">
        <img src="/favicon.svg" alt="" className="h-full w-full object-contain" aria-hidden="true" />
      </span>
      <span className="text-lg md:text-xl font-semibold text-gray-900">Kiki</span>
    </Link>
  );
}

function FooterGroup({
  title,
  links,
  highlightFirst = false,
}: {
  title: string;
  links: Array<[string, string]>;
  highlightFirst?: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-gray-900">{title}</h2>
      <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600">
        {links.map(([label, href], index) => (
          <li key={label}>
            <Link
              href={href}
              className={highlightFirst && index === 0 ? 'hover:text-purple-600 text-purple-600 font-medium' : 'hover:text-gray-900'}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PageShell({ children, darkInitial = false }: { children: ReactNode; darkInitial?: boolean }) {
  return (
    <div className={`min-h-screen text-gray-900 ${darkInitial ? 'bg-[#0a0514]' : 'bg-white'}`}>
      <ReactiveHeader />
      <div className="public-page-transition">{children}</div>
      <Footer />
    </div>
  );
}

export function Hero() {
  return (
    <section className="pt-24 md:pt-32 pb-12 md:pb-16 px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center public-fade-up">
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 bg-purple-50 rounded-full mb-4 md:mb-6">
          <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-600" aria-hidden="true" />
          <span className="text-xs md:text-sm font-medium text-purple-900">Organize sua vida com IA</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 tracking-tight text-gray-900 leading-[1.1] px-2">
          Seu assistente pessoal
          <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            inteligente para o dia a dia
          </span>
        </h1>

        <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
          Kiki aprende com você, gerencia sua agenda e conta com agentes que trabalham em segundo plano: pesquisando,
          comparando e descobrindo tudo que você precisa.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
          <Link
            href={dashboardRoutes.signup}
            className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-xl transition-all text-base md:text-lg"
          >
            Começar grátis
          </Link>
          <Link
            href="/agentes"
            className="px-6 md:px-8 py-3 md:py-4 border-2 border-purple-200 text-purple-700 rounded-full font-semibold hover:bg-purple-50 transition-colors text-base md:text-lg flex items-center justify-center gap-2"
          >
            <Bot className="w-5 h-5" aria-hidden="true" /> Ver os Agentes
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FeatureSection({
  reverse = false,
  eyebrow,
  headline,
  body,
  ctaHref,
  ctaLabel,
  mockup,
  mockupBg,
}: {
  reverse?: boolean;
  eyebrow: ReactNode;
  headline: ReactNode;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  mockup: ReactNode;
  mockupBg: string;
}) {
  return (
    <section className="py-20 md:py-28 px-6 bg-white border-b border-gray-100 public-screen-section">
      <div className={`max-w-6xl mx-auto flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-20`}>
        <div className="flex-1 min-w-0 public-fade-up">
          <div className="inline-flex items-center gap-2 text-purple-600 mb-5 text-sm font-medium">{eyebrow}</div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-6">{headline}</h1>
          <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-8 max-w-md">{body}</p>
          <Link href={ctaHref} className="inline-flex items-center gap-2 text-gray-900 font-semibold hover:text-purple-600 transition-colors group text-base">
            {ctaLabel}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>

        <div className="flex-1 w-full min-w-0 public-card-motion">
          <div className={`rounded-3xl bg-gradient-to-br ${mockupBg} p-6 md:p-10 flex items-center justify-center min-h-[340px]`}>
            {mockup}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AgentDoctorMockup() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Assistente de saúde</p>
            <p className="text-sm font-semibold text-gray-900">Buscando cardiologistas</p>
          </div>
          <span className="ml-auto flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Pesquisando
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {[
          ['Dr. Carlos Mendes', 'Cardiologista · Convênio · 0,8 km', 'Agenda disponível amanhã, 14h'],
          ['Dra. Ana Figueiredo', 'Cardiologista · Convênio · 1,4 km', 'Agenda disponível hoje, 17h'],
        ].map(([name, meta, time]) => (
          <div key={name} className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{name}</p>
              <p className="text-xs text-gray-500">{meta}</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">{time}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-gray-400">Verificando mais 4 especialistas...</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-400 flex-1 italic">"Acha cardiologistas perto de mim com convênio"</p>
        </div>
      </div>
    </div>
  );
}

export function CalendarMockup() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Kiki Calendar</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Adicionado</p>
          <p className="text-sm font-bold text-gray-900">Reunião de planejamento Q3</p>
          <p className="text-xs text-gray-500 mt-0.5">Sex, 6 Jun · 9:00 - 10:30</p>
        </div>
        <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Bloqueado</p>
          <p className="text-sm font-bold text-gray-900">Foco profundo</p>
          <p className="text-xs text-gray-500 mt-0.5">Sex, 6 Jun · 14:00 - 16:00</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-700 leading-relaxed">
            Adicionei a reunião e bloqueei 2h de foco à tarde para você não ser interrompido.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 mt-3">
          <p className="text-sm text-gray-400 flex-1 italic">"Agenda reunião sexta de manhã e bloqueia minha tarde"</p>
        </div>
      </div>
    </div>
  );
}

export function ChatMockup() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex justify-end">
          <div className="bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
            <p className="text-sm">Qual o melhor horário pra eu fazer exercício essa semana?</p>
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
            <p className="text-sm text-gray-800">
              Olhando sua agenda: terça e quinta de manhã estão livres das 7h às 9h.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
            <p className="text-sm">Bloqueia terça e quinta 7h-8h pra mim então</p>
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
            <p className="text-sm text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" /> Pronto! Bloqueados como "Exercício".
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 flex items-center gap-2 bg-white border-t border-gray-100 pt-4">
        <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-400">Pergunte qualquer coisa...</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
          <ArrowRight className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function DarkSplashSection({
  eyebrow,
  children,
  description,
}: {
  eyebrow: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <section className="public-dark-splash relative min-h-screen overflow-hidden px-6 md:px-8">
      <div className="public-dark-copy-shell select-none public-fade-up">
        <p className="public-dark-eyebrow-anchor px-6 text-[10px] uppercase tracking-[0.3em] text-white/60 md:text-sm">{eyebrow}</p>
        <h1 className="public-dark-title-anchor mx-auto grid max-w-4xl place-content-center gap-1 px-6 text-balance text-[clamp(1.7rem,4.4vw,3.9rem)] font-bold leading-[1.08] text-white">{children}</h1>
        {description ? <p className="public-dark-description-anchor mx-auto max-w-2xl px-6 text-base text-white/40 md:text-lg">{description}</p> : null}
      </div>
    </section>
  );
}

export function GradientText({ children }: { children: ReactNode }) {
  return <span className="bg-gradient-to-r from-violet-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">{children}</span>;
}

export function StepSlide({ title, desc, detail }: { title: string; desc: string; detail?: string }) {
  return (
    <section className="public-dark-splash public-snap-slide relative min-h-screen scroll-mt-16 overflow-hidden px-6 md:px-8">
      <div className="public-dark-copy-shell select-none public-fade-up">
        <h2 className="public-dark-title-anchor mx-auto grid max-w-3xl place-content-center px-6 text-balance text-[clamp(1.7rem,4.4vw,3.9rem)] font-bold leading-[1.08] text-white">{title}</h2>
        <p className="public-dark-description-anchor mx-auto max-w-2xl px-6 text-lg leading-relaxed text-white/60">{desc}</p>
        {detail ? <p className="public-dark-action-anchor mx-auto max-w-2xl px-6 text-sm leading-relaxed text-white/35">{detail}</p> : null}
      </div>
    </section>
  );
}

export function PageCta({
  title,
  description,
  href = dashboardRoutes.signup,
  label = 'Começar grátis',
  dark = false,
}: {
  title: ReactNode;
  description: string;
  href?: string;
  label?: string;
  dark?: boolean;
}) {
  return (
    <section className={`${dark ? 'public-dark-splash relative min-h-screen text-white' : 'bg-white border-t border-gray-100 py-20 md:py-28'} px-6`}>
      {dark ? (
        <div className="public-dark-copy-shell public-fade-up">
          <h2 className="public-dark-title-anchor mx-auto max-w-3xl px-6 text-balance text-[clamp(1.7rem,4.4vw,3.9rem)] font-bold leading-[1.08] text-white">{title}</h2>
          <p className="public-dark-description-anchor mx-auto max-w-2xl px-6 text-base text-gray-400 md:text-lg">{description}</p>
          <div className="public-dark-action-anchor">
            <Link href={href} className="inline-flex px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-xl hover:shadow-purple-900/40 transition-all text-base md:text-lg">
              {label}
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative z-10 max-w-2xl mx-auto text-center public-fade-up">
          <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight text-gray-900">{title}</h2>
          <p className="text-gray-500 mb-10 text-base md:text-lg">{description}</p>
          <Link href={href} className="inline-flex px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-xl hover:shadow-purple-900/40 transition-all text-base md:text-lg">
            {label}
          </Link>
        </div>
      )}
    </section>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-10 md:mb-16 public-fade-up">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-gray-900 px-4">{title}</h2>
      <p className="text-base md:text-lg text-gray-600">{subtitle}</p>
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14 px-4 public-fade-up">
      {eyebrow ? <p className="text-sm font-semibold text-purple-700 mb-3">{eyebrow}</p> : null}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">{title}</h1>
      <p className="text-base md:text-lg text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

export function Card({ children, featured = false }: { children: ReactNode; featured?: boolean }) {
  return (
    <article
      className={`rounded-2xl md:rounded-3xl p-6 md:p-8 bg-white transition-all public-card-motion ${
        featured ? 'border-2 border-purple-600 shadow-lg shadow-purple-600/15' : 'border border-gray-200 shadow-sm'
      }`}
    >
      {children}
    </article>
  );
}

export function GradientIcon({
  children,
  color,
  className = '',
}: {
  children: ReactNode;
  color: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg md:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}

export function CheckList({ items, featured = false }: { items: readonly string[]; featured?: boolean }) {
  return (
    <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 md:gap-3 text-gray-700">
          <Check className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${featured ? 'text-purple-600' : 'text-gray-400'}`} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function TextLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2">
      {children}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}
