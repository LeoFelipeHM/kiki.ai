import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '../public-site/components';
import { dashboardRoutes } from '../public-site/routes';
import { defaultOgImage } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Criar conta grátis',
  description: 'Crie sua conta grátis na Kiki para começar a organizar agenda, tarefas, compromissos e lembretes com IA.',
  alternates: { canonical: '/cadastro' },
  openGraph: {
    title: 'Começar grátis com a Kiki',
    description: 'Organize sua rotina com uma assistente pessoal inteligente.',
    url: '/cadastro',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Criar conta grátis na Kiki' }],
  },
  twitter: {
    title: 'Começar grátis com a Kiki',
    description: 'Organize sua rotina com uma assistente pessoal inteligente.',
    images: [defaultOgImage],
  },
};

export default function CadastroPage() {
  return (
    <PageShell>
      <main className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 bg-gray-50 min-h-screen public-detail-surface">
        <div className="max-w-md mx-auto public-fade-up">
          <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm">
            <div className="text-center mb-6 md:mb-8">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white md:mb-4 md:h-16 md:w-16">
                <img src="/favicon.svg" alt="" className="h-full w-full object-contain" aria-hidden="true" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">Crie sua conta</h1>
              <p className="text-sm md:text-base text-gray-600">Comece grátis, sem cartão de crédito</p>
            </div>

            <form className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-gray-700" htmlFor="name">
                  Nome completo
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-gray-700" htmlFor="email">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2 text-gray-700" htmlFor="password">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white border border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm md:text-base"
                />
              </div>

              <Link href={dashboardRoutes.signup} className="block w-full text-center py-2.5 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg md:rounded-xl font-semibold hover:shadow-lg transition-all text-sm md:text-base">
                Criar conta grátis
              </Link>

              <p className="text-center text-xs md:text-sm text-gray-600">
                Já tem uma conta?{' '}
                <Link href={dashboardRoutes.login} className="text-purple-600 hover:text-purple-700 font-medium">
                  Entrar
                </Link>
              </p>
            </form>

            <div className="mt-5 md:mt-6 pt-5 md:pt-6 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500 leading-relaxed">
                Ao criar uma conta, você concorda com nossos{' '}
                <Link href="/termos" className="text-purple-600 hover:underline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link href="/privacidade" className="text-purple-600 hover:underline">
                  Política de Privacidade
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
