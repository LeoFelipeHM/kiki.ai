import type { Metadata } from 'next';
import { Bot, Calendar, MessageCircle } from 'lucide-react';
import {
  AgentDoctorMockup,
  CalendarMockup,
  ChatMockup,
  FeatureSection,
  PageCta,
  PageShell,
} from './public-site/components';
import { IntroSequence } from './public-site/IntroSequence';
import { dashboardRoutes } from './public-site/routes';
import {
  defaultOgImage,
  organizationJsonLd,
  softwareApplicationJsonLd,
  StructuredData,
  websiteJsonLd,
} from './public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Assistente pessoal com IA para organizar sua rotina',
  description:
    'Conheça a Kiki, assistente pessoal com IA para organizar agenda, tarefas, lembretes, notas e agentes que pesquisam por você em segundo plano.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Kiki | Assistente pessoal com IA para organizar sua rotina',
    description: 'Organize agenda, tarefas, lembretes e notas com uma assistente pessoal inteligente.',
    url: '/',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Kiki assistente pessoal com IA' }],
  },
  twitter: {
    title: 'Kiki | Assistente pessoal com IA para organizar sua rotina',
    description: 'Organize agenda, tarefas, lembretes e notas com uma assistente pessoal inteligente.',
    images: [defaultOgImage],
  },
};

export default function HomePage() {
  return (
    <PageShell>
      <StructuredData data={[organizationJsonLd(), websiteJsonLd(), softwareApplicationJsonLd()]} />
      <IntroSequence
        slides={[
          {
            eyebrow: 'Kiki',
            title: 'O assistente de IA',
            gradient: 'que trabalha por você.',
          },
        ]}
      />
      <main>
        <FeatureSection
          eyebrow={<><Bot className="w-4 h-4" aria-hidden="true" /> Assistentes autônomos</>}
          headline={<>Assistentes que trabalham<br />enquanto você descansa.</>}
          body="Diga o que precisa em linguagem natural. Os assistentes da Kiki saem em campo, pesquisam em múltiplas fontes e entregam o resultado pronto, sem você levantar um dedo."
          ctaHref="/agentes"
          ctaLabel="Conhecer todos os assistentes"
          mockup={<AgentDoctorMockup />}
          mockupBg="from-purple-100 via-violet-100 to-blue-100"
        />
        <FeatureSection
          reverse
          eyebrow={<><Calendar className="w-4 h-4" aria-hidden="true" /> Agenda inteligente</>}
          headline={<>Seu mundo<br />organizado.</>}
          body="Conecte sua agenda, reorganize reuniões com um comando e bloqueie tempo focado. Kiki entende seu calendário e agenda por você."
          ctaHref="/como-funciona"
          ctaLabel="Ver como funciona"
          mockup={<CalendarMockup />}
          mockupBg="from-blue-100 via-sky-50 to-indigo-100"
        />
        <FeatureSection
          eyebrow={<><MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat com IA</>}
          headline={<>É só mostrar<br />e falar.</>}
          body="Converse por texto ou voz. Kiki entende contexto, aprende suas preferências e responde com informações visuais em tempo real."
          ctaHref={dashboardRoutes.signup}
          ctaLabel="Começar grátis"
          mockup={<ChatMockup />}
          mockupBg="from-pink-100 via-rose-50 to-purple-100"
        />
        <PageCta
          title={<>Pronto para ter<br />um assistente de verdade?</>}
          description="Cadastro grátis, sem cartão de crédito."
        />
      </main>
    </PageShell>
  );
}
