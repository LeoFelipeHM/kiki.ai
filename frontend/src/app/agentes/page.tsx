import type { Metadata } from 'next';
import { AgentsCarousel } from '../public-site/AgentsCarousel';
import { PageCta, PageShell } from '../public-site/components';
import { IntroSequence } from '../public-site/IntroSequence';
import { breadcrumbJsonLd, defaultOgImage, StructuredData } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Agentes de IA para pesquisar preços, viagens e serviços',
  description:
    'Conheça os agentes de IA da Kiki para pesquisar passagens, comparar preços, encontrar contatos médicos e descobrir serviços locais.',
  alternates: { canonical: '/agentes' },
  openGraph: {
    title: 'Agentes de IA da Kiki',
    description:
      'Agentes que trabalham em segundo plano pesquisando, comparando e trazendo resultados prontos para você.',
    url: '/agentes',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Agentes de IA da Kiki' }],
  },
  twitter: {
    title: 'Agentes de IA da Kiki',
    description:
      'Agentes que trabalham em segundo plano pesquisando, comparando e trazendo resultados prontos para você.',
    images: [defaultOgImage],
  },
};

export default function AgentesPage() {
  return (
    <PageShell darkInitial>
      <StructuredData data={breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Agentes', path: '/agentes' }])} />
      <IntroSequence
        slides={[
          {
            eyebrow: 'Kiki',
            title: 'Assistentes que trabalham',
            gradient: 'por você',
          },
          {
            eyebrow: 'Pedido',
            title: 'Você pede',
            gradient: 'em linguagem natural.',
            description: 'Sem formulários, sem filtros, sem complicação.',
          },
          {
            eyebrow: 'Execução',
            title: 'O assistente trabalha',
            gradient: 'sozinho.',
            description: 'Pesquisa, compara e filtra em múltiplas fontes enquanto você segue com seu dia.',
          },
          {
            eyebrow: 'Entrega',
            title: 'Resultado pronto',
            gradient: 'pra você.',
            description: 'Tudo organizado, rankeado e pronto para decidir.',
          },
        ]}
      />
      <main>
        <section className="flex min-h-[calc(100dvh-4rem)] flex-col justify-center border-b border-gray-100 bg-white px-6 py-16 md:py-24">
          <div className="mx-auto mb-10 max-w-3xl text-center public-fade-up md:mb-14">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-purple-700">Assistentes disponíveis</p>
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl lg:text-5xl">
              Cada assistente é especialista no que faz.
            </h2>
          </div>
          <AgentsCarousel />
        </section>
        <PageCta
          title={<>Pronto para ter assistentes<br />trabalhando por você?</>}
          description="Crie sua conta grátis e experimente o poder dos assistentes Kiki hoje mesmo."
          label="Começar grátis agora"
        />
      </main>
    </PageShell>
  );
}
