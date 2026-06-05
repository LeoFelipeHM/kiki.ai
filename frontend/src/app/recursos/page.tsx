import type { Metadata } from 'next';
import { Bot, Calendar, MessageCircle } from 'lucide-react';
import {
  AgentDoctorMockup,
  CalendarMockup,
  ChatMockup,
  FeatureSection,
  PageCta,
  PageShell,
} from '../public-site/components';
import { IntroSequence } from '../public-site/IntroSequence';
import { breadcrumbJsonLd, defaultOgImage, StructuredData } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Recursos para organizar agenda, tarefas e lembretes com IA',
  description:
    'Veja como a Kiki organiza agenda, tarefas, lembretes, notas, conversas por IA e agentes autônomos em uma rotina mais clara.',
  alternates: { canonical: '/recursos' },
  openGraph: {
    title: 'Recursos da Kiki',
    description: 'Organize tarefas, compromissos, lembretes e notas com uma assistente pessoal inteligente.',
    url: '/recursos',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Recursos da Kiki para organizar a rotina' }],
  },
  twitter: {
    title: 'Recursos da Kiki',
    description: 'Organize tarefas, compromissos, lembretes e notas com uma assistente pessoal inteligente.',
    images: [defaultOgImage],
  },
};

export default function RecursosPage() {
  return (
    <PageShell darkInitial>
      <StructuredData data={breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Recursos', path: '/recursos' }])} />
      <IntroSequence
        slides={[
          {
            eyebrow: 'Recursos',
            title: 'Tudo que você precisa',
            gradient: 'em um só lugar.',
            description: 'Tarefas, eventos e notas organizados com inteligência.',
          },
          {
            eyebrow: 'Chat com IA',
            title: 'Fale como fala',
            gradient: 'com um amigo.',
          },
          {
            eyebrow: 'Agenda e reuniões',
            title: 'Calendário e notas',
            gradient: 'trabalhando juntos.',
          },
        ]}
      />
      <main>
        <FeatureSection
          eyebrow={<><MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat com IA</>}
          headline={<>Fale como fala<br />com um amigo.</>}
          body="Texto ou voz. Kiki entende contexto, aprende suas preferências e responde com ações diretas, sem precisar repetir o que você já disse."
          ctaHref="/cadastro"
          ctaLabel="Começar grátis"
          mockup={<ChatMockup />}
          mockupBg="from-purple-100 via-pink-50 to-rose-100"
        />
        <FeatureSection
          reverse
          eyebrow={<><Calendar className="w-4 h-4" aria-hidden="true" /> Agenda e reuniões</>}
          headline={<>Calendário e notas<br />trabalhando juntos.</>}
          body="Visualize eventos, tarefas e notas em um só lugar. Kiki organiza sua semana, bloqueia tempo focado e avisa na hora certa."
          ctaHref="/como-funciona"
          ctaLabel="Ver como funciona"
          mockup={<CalendarMockup />}
          mockupBg="from-blue-100 via-sky-50 to-indigo-100"
        />
        <FeatureSection
          eyebrow={<><Bot className="w-4 h-4" aria-hidden="true" /> Assistentes autônomos</>}
          headline={<>Tarefas que a Kiki<br />resolve por você.</>}
          body="Os assistentes pesquisam passagens, comparam preços, encontram médicos e prestadores, tudo em segundo plano enquanto você faz outra coisa."
          ctaHref="/agentes"
          ctaLabel="Conhecer os assistentes"
          mockup={<AgentDoctorMockup />}
          mockupBg="from-violet-100 via-purple-50 to-pink-100"
        />
        <PageCta title="Comece a usar Kiki hoje." description="Grátis, sem cartão de crédito." />
      </main>
    </PageShell>
  );
}
