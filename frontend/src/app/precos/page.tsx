import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CheckList, PageShell, SectionHeader } from '../public-site/components';
import { plans } from '../public-site/data';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Preços',
  description: 'Planos da Kiki para organizar sua rotina com IA, incluindo plano grátis e opção Pro.',
  alternates: { canonical: '/precos' },
  openGraph: {
    title: 'Preços da Kiki',
    description: 'Escolha o plano ideal para organizar sua rotina com IA.',
    url: '/precos',
  },
  twitter: {
    title: 'Preços da Kiki',
    description: 'Escolha o plano ideal para organizar sua rotina com IA.',
  },
};

export default function PrecosPage() {
  return (
    <PageShell>
      <main className="pt-24 md:pt-32 pb-16">
        <SectionHeader
          eyebrow="Preços"
          title="Comece simples e evolua quando precisar"
          description="Planos pensados para testar, usar no dia a dia e escalar a organização com mais recursos."
        />
        <section className="max-w-6xl mx-auto px-4 md:px-6 grid md:grid-cols-3 gap-5 md:gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} featured={plan.featured}>
              {plan.featured ? (
                <span className="inline-flex px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium mb-4">
                  Recomendado
                </span>
              ) : null}
              <h2 className="text-2xl font-bold mb-2 text-gray-900">{plan.name}</h2>
              <p className="text-gray-600 mb-5">{plan.description}</p>
              <p className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                {plan.price.startsWith('R$') ? <span className="text-gray-600">/mês</span> : null}
              </p>
              <Link
                href="/cadastro"
                className={`block w-full text-center py-3 px-6 rounded-full font-medium transition-all mb-6 ${
                  plan.featured ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
              <CheckList items={plan.items} />
            </Card>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
