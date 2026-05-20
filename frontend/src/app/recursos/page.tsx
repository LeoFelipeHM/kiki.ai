import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, PageShell, SectionHeader } from '../public-site/components';
import { features } from '../public-site/data';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Recursos',
  description: 'Conheça os recursos da Kiki para organizar tarefas, compromissos, lembretes, notas e rotina com IA.',
  alternates: { canonical: '/recursos' },
  openGraph: {
    title: 'Recursos da Kiki',
    description: 'Organize tarefas, compromissos, lembretes e notas com uma assistente pessoal inteligente.',
    url: '/recursos',
  },
  twitter: {
    title: 'Recursos da Kiki',
    description: 'Organize tarefas, compromissos, lembretes e notas com uma assistente pessoal inteligente.',
  },
};

export default function RecursosPage() {
  return (
    <PageShell>
      <main className="pt-24 md:pt-32 pb-16">
        <SectionHeader
          eyebrow="Recursos"
          title="Tudo que sua rotina precisa em um só lugar"
          description="A Kiki combina agenda, tarefas, lembretes, notas e conversa natural para reduzir o esforço de se manter organizado."
        />
        <section className="max-w-6xl mx-auto px-4 md:px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <Icon className="w-9 h-9 text-purple-600 mb-4" aria-hidden="true" />
                <h2 className="text-xl font-bold mb-2 text-gray-900">{feature.title}</h2>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </section>
        <div className="text-center mt-10">
          <Link href="/cadastro" className="inline-flex px-7 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:shadow-lg transition-all">
            Começar grátis
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
