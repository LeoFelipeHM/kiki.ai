import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Hero, PageShell, SectionHeader } from './public-site/components';
import { features, homeHighlights, steps } from './public-site/data';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <PageShell>
      <main>
        <Hero />

        <section className="py-12 md:py-20 px-4 md:px-6 bg-gray-50">
          <SectionHeader
            eyebrow="Organização inteligente"
            title="Uma rotina mais clara começa com menos coisas soltas"
            description="A Kiki centraliza compromissos, tarefas e lembretes em uma experiência simples para consultar todos os dias."
          />
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5 md:gap-6">
            {homeHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <Icon className="w-9 h-9 text-purple-600 mb-4" aria-hidden="true" />
                  <h2 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h2>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="py-12 md:py-20 px-4 md:px-6">
          <SectionHeader
            eyebrow="Recursos"
            title="Feita para organizar seu dia sem complicar"
            description="Os principais recursos ficam prontos para indexação, leitura rápida e navegação direta."
          />
          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {features.slice(0, 6).map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <Icon className="w-8 h-8 text-purple-600 mb-4" aria-hidden="true" />
                  <h2 className="text-lg md:text-xl font-bold mb-2 text-gray-900">{feature.title}</h2>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link href="/recursos" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-colors">
              Ver todos os recursos
            </Link>
          </div>
        </section>

        <section className="py-12 md:py-20 px-4 md:px-6 bg-gray-50">
          <SectionHeader
            eyebrow="Como funciona"
            title="Da conversa à rotina organizada"
            description="Uma jornada simples para transformar demandas soltas em ações acompanháveis."
          />
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 md:gap-6">
            {steps.map((step, index) => (
              <Card key={step.title}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold mb-4">
                  {index + 1}
                </span>
                <h2 className="text-xl font-bold mb-2 text-gray-900">{step.title}</h2>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">{step.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
