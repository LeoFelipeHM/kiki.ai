import type { Metadata } from 'next';
import { PageCta, PageShell } from '../public-site/components';
import { IntroSequence } from '../public-site/IntroSequence';
import { breadcrumbJsonLd, defaultOgImage, StructuredData } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Como funciona a assistente pessoal com IA da Kiki',
  description:
    'Entenda como a Kiki transforma conversas em tarefas, compromissos, lembretes, notas e agentes de IA trabalhando por você.',
  alternates: { canonical: '/como-funciona' },
  openGraph: {
    title: 'Como a Kiki funciona',
    description: 'Da conversa natural à rotina organizada com IA.',
    url: '/como-funciona',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Como a Kiki funciona' }],
  },
  twitter: {
    title: 'Como a Kiki funciona',
    description: 'Da conversa natural à rotina organizada com IA.',
    images: [defaultOgImage],
  },
};

const examples = [
  '"Bloqueia minha tarde de quinta para foco profundo"',
  '"Acha um cardiologista perto de mim com convênio"',
  '"Compara o iPhone 16 nas principais lojas online"',
  '"Qual o melhor horário pra eu treinar essa semana?"',
  '"Agenda reunião com o time na sexta de manhã"',
  '"Encontra um barbeiro bem avaliado a 2km daqui"',
];

export default function ComoFuncionaPage() {
  return (
    <PageShell>
      <StructuredData
        data={breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Como funciona', path: '/como-funciona' }])}
      />
      <IntroSequence
        slides={[
          {
            eyebrow: 'Como funciona',
            title: 'Comece em',
            gradient: 'minutos.',
          },
          {
            eyebrow: 'Conta',
            title: 'Crie sua conta.',
            description: 'Cadastro em segundos, sem cartão de crédito.',
          },
          {
            eyebrow: 'Conversa',
            title: 'Converse com Kiki.',
            description: 'Conte sobre sua rotina. Kiki aprende e se adapta a você.',
          },
          {
            eyebrow: 'Rotina',
            title: 'Viva organizado.',
            description: 'Sugestões inteligentes, assistentes trabalhando e tudo sob controle.',
          },
        ]}
      />
      <main>
        <section className="min-h-[calc(100vh-64px)] flex flex-col justify-center px-8 bg-white public-snap-slide">
          <div className="max-w-2xl mx-auto w-full public-fade-up">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-8">O que você pode pedir</p>
            <div className="space-y-5">
              {examples.map((example) => (
                <p
                  key={example}
                  className="text-gray-700 border-b border-gray-100 pb-5 italic text-[clamp(0.95rem,2vw,1.15rem)]"
                >
                  {example}
                </p>
              ))}
            </div>
          </div>
        </section>
        <PageCta
          dark
          title={<>Pronto para<br />começar?</>}
          description="Grátis, sem cartão de crédito."
          label="Criar conta grátis"
        />
      </main>
    </PageShell>
  );
}
