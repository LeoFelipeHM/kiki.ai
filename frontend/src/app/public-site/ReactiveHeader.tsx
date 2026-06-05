'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { dashboardRoutes, publicRoutes } from './routes';

const darkIntroRoutes = new Set(['/', '/agentes', '/recursos', '/como-funciona']);

export function ReactiveHeader() {
  const pathname = usePathname();
  const [isAtTop, setIsAtTop] = useState(true);
  const [isIntroActive, setIsIntroActive] = useState(false);
  const isDarkTop = darkIntroRoutes.has(pathname) && isAtTop && isIntroActive;

  useEffect(() => {
    const update = () => setIsAtTop(window.scrollY < 48);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      setIsIntroActive(document.documentElement.dataset.publicIntroActive === 'true');
    };
    const observer = new MutationObserver(update);

    update();
    observer.observe(document.documentElement, {
      attributeFilter: ['data-public-intro-active'],
      attributes: true,
    });

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-[120] border-b backdrop-blur-xl transition-all duration-300 ${
        isDarkTop ? 'border-white/10 bg-transparent' : 'border-gray-100 bg-white/80'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6">
          <div className="md:flex md:justify-start">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 md:gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 md:h-8 md:w-8">
                <Sparkles className="h-4 w-4 text-white md:h-5 md:w-5" aria-hidden="true" />
              </span>
              <span className={`text-lg font-semibold transition-colors md:text-xl ${isDarkTop ? 'text-white' : 'text-gray-900'}`}>
                Kiki
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegacao principal">
            {publicRoutes.slice(1, 5).map((route) => {
              const isAgents = route.href === '/agentes';
              const darkClass = isAgents
                ? 'text-pink-200 hover:bg-white/10 hover:text-white'
                : 'text-white/75 hover:bg-white/10 hover:text-white';
              const lightClass = isAgents
                ? 'text-purple-600 hover:bg-purple-50'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900';

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors ${
                    isDarkTop ? darkClass : lightClass
                  }`}
                >
                  {isAgents ? <Bot className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {route.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center justify-end gap-3 md:flex">
            <Link
              href={dashboardRoutes.login}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                isDarkTop ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-sm text-white transition-all hover:shadow-lg"
            >
              Começar grátis
            </Link>
          </div>

          <details className="relative md:hidden">
            <summary
              className={`list-none rounded-lg p-2 transition-colors ${
                isDarkTop ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'
              } cursor-pointer`}
            >
              <span className="block h-5 w-5" aria-hidden="true">
                <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
                <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
                <span className="my-1 block h-0.5 w-5 rounded-full bg-current" />
              </span>
              <span className="sr-only">Abrir menu</span>
            </summary>
            <nav className="public-scale-in absolute right-0 mt-3 w-56 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
              {publicRoutes.slice(1, 5).map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                    route.href === '/agentes' ? 'text-purple-600 hover:bg-purple-50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {route.href === '/agentes' ? <Bot className="h-4 w-4" aria-hidden="true" /> : null}
                  {route.label}
                </Link>
              ))}
              <Link href={dashboardRoutes.login} className="block rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                Entrar
              </Link>
              <Link href="/cadastro" className="block rounded-xl px-4 py-3 text-sm text-purple-700 hover:bg-purple-50">
                Começar grátis
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
