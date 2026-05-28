import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell, SectionHeader } from '../public-site/components';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Começar grátis',
  description: 'Crie sua conta grátis na Kiki para começar a organizar tarefas, compromissos e lembretes.',
  alternates: { canonical: '/cadastro' },
  openGraph: {
    title: 'Começar grátis com a Kiki',
    description: 'Organize sua rotina com uma assistente pessoal inteligente.',
    url: '/cadastro',
  },
  twitter: {
    title: 'Começar grátis com a Kiki',
    description: 'Organize sua rotina com uma assistente pessoal inteligente.',
  },
};

export default function CadastroPage() {
  return (
    <PageShell>
      <main className="pt-24 md:pt-32 pb-16 bg-gray-50">
        <SectionHeader
          eyebrow="Cadastro"
          title="Comece a organizar sua rotina"
          description="A criação de conta continua conectada ao fluxo autenticado atual. Esta página pública entrega conteúdo SEO-first e direciona para o app."
        />
        <section className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="name">
                  Nome completo
                </label>
                <input id="name" type="text" placeholder="Seu nome" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="email">
                  E-mail
                </label>
                <input id="email" type="email" placeholder="seu@email.com" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="password">
                  Senha
                </label>
                <input id="password" type="password" placeholder="Mínimo 8 caracteres" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all" />
              </div>
              <Link href="/login" className="block w-full text-center py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition-all">
                Criar conta grátis
              </Link>
            </form>
            <p className="text-center text-sm text-gray-600 mt-5">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                Entrar
              </Link>
            </p>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
