import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, PageShell, SectionHeader } from '../public-site/components';
import { steps } from '../public-site/data';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Como funciona',
  description: 'Veja como a Kiki transforma conversas em tarefas, compromissos e lembretes organizados.',
  alternates: { canonical: '/como-funciona' },
  openGraph: {
    title: 'Como a Kiki funciona',
    description: 'Da conversa natural à rotina organizada com IA.',
    url: '/como-funciona',
  },
  twitter: {
    title: 'Como a Kiki funciona',
    description: 'Da conversa natural à rotina organizada com IA.',
  },
};

export default function ComoFuncionaPage() {
  return (
    <PageShell>
      <main className="pt-24 md:pt-32 pb-16 bg-gray-50">
        <SectionHeader
          eyebrow="Como funciona"
          title="Organização em três passos simples"
          description="A experiência pública é renderizada pelo Next.js, enquanto a área autenticada segue funcionando como SPA."
        />
        <section className="max-w-5xl mx-auto px-4 md:px-6 grid md:grid-cols-3 gap-5 md:gap-6">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold mb-4">
                {index + 1}
              </span>
              <h2 className="text-xl font-bold mb-2 text-gray-900">{step.title}</h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </section>
        <div className="text-center mt-10">
          <Link href="/precos" className="inline-flex px-7 py-3 rounded-full bg-white text-gray-900 border border-gray-200 font-medium hover:bg-gray-100 transition-colors">
            Ver preços
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
