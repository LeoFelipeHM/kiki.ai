import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Check, Menu, Star } from 'lucide-react';
import { dashboardRoutes, publicRoutes } from './routes';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/favicon.svg"
              alt=""
              width={32}
              height={32}
              priority
              className="h-8 w-8 rounded-lg object-contain shrink-0"
            />
            <span className="text-xl font-semibold text-gray-900">Kiki</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            {publicRoutes.slice(1, 4).map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="px-4 py-2 text-sm rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href={dashboardRoutes.login}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="px-5 py-2 text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:shadow-lg transition-all"
            >
              Começar grátis
            </Link>
          </div>

          <details className="md:hidden relative">
            <summary className="list-none p-2 text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer">
              <Menu className="w-5 h-5" aria-hidden="true" />
              <span className="sr-only">Abrir menu</span>
            </summary>
            <nav className="absolute right-0 mt-3 w-56 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
              {publicRoutes.slice(1).map((route) => (
                <Link key={route.href} href={route.href} className="block px-4 py-3 text-sm text-gray-700 rounded-xl hover:bg-gray-50">
                  {route.label}
                </Link>
              ))}
              <Link href={dashboardRoutes.login} className="block px-4 py-3 text-sm text-purple-700 rounded-xl hover:bg-purple-50">
                Entrar
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
            <Link href="/" className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity">
              <Image src="/favicon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-xl font-semibold text-gray-900">Kiki</span>
            </Link>
            <p className="text-sm text-gray-600">Seu assistente pessoal inteligente.</p>
          </div>
          <FooterGroup title="Produto" links={[['Recursos', '/recursos'], ['Preços', '/precos'], ['Como funciona', '/como-funciona']]} />
          <FooterGroup title="Conta" links={[['Começar grátis', '/cadastro'], ['Entrar', '/login']]} />
          <FooterGroup title="Legal" links={[['Privacidade', '/'], ['Termos', '/'], ['Segurança', '/']]} />
        </div>
        <div className="pt-6 md:pt-8 border-t border-gray-100 text-center">
          <p className="text-xs md:text-sm text-gray-600">© 2026 Kiki. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-3 text-gray-900">{title}</h2>
      <ul className="space-y-2 text-sm text-gray-600">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="hover:text-gray-900">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

export function Hero() {
  return (
    <section className="pt-24 md:pt-32 pb-12 md:pb-16 px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 bg-purple-50 rounded-full mb-4 md:mb-6">
          <Star className="w-4 h-4 text-purple-600" aria-hidden="true" />
          <span className="text-xs md:text-sm font-medium text-purple-900">Menos caos, mais clareza</span>
        </div>
        <h1 className="text-[18px] sm:text-2xl md:text-[32px] lg:text-[40px] font-bold mb-4 md:mb-6 tracking-tight text-gray-900 leading-[1.22] px-2 overflow-visible">
          <span className="block whitespace-nowrap">Eu organizo sua rotina</span>
          <span className="block pb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent leading-[1.22]">
            de forma inteligente
          </span>
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
          Olá, eu sou a Kiki. Cuido dos seus compromissos, tarefas e lembretes para deixar seu dia mais leve e organizado.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
          <Link href="/cadastro" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-medium hover:shadow-lg transition-all">
            Começar grátis
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link href="/recursos" className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-gray-900 bg-gray-100 rounded-full font-medium hover:bg-gray-200 transition-colors">
            Ver todos os recursos
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14 px-4">
      {eyebrow ? <p className="text-sm font-semibold text-purple-700 mb-3">{eyebrow}</p> : null}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">{title}</h1>
      <p className="text-base md:text-lg text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

export function Card({ children, featured = false }: { children: ReactNode; featured?: boolean }) {
  return (
    <article
      className={`rounded-2xl md:rounded-3xl p-6 md:p-8 bg-white transition-all ${
        featured ? 'border-2 border-purple-600 shadow-lg shadow-purple-600/15' : 'border border-gray-200 shadow-sm'
      }`}
    >
      {children}
    </article>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2 md:space-y-3 text-sm">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-gray-700">
          <Check className="w-5 h-5 text-purple-600 flex-shrink-0" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}
