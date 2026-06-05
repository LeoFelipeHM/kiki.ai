import type { Metadata } from 'next';
import { PageShell } from '../public-site/components';
import { breadcrumbJsonLd, defaultOgImage, StructuredData } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Segurança',
  description:
    'Conheça as práticas de segurança da Kiki para proteger contas, dados de rotina, notas, tarefas e recursos com IA.',
  alternates: { canonical: '/seguranca' },
  openGraph: {
    title: 'Segurança da Kiki',
    description: 'Como a Kiki protege dados e contas na experiência de assistente pessoal com IA.',
    url: '/seguranca',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Segurança da Kiki' }],
  },
  twitter: {
    title: 'Segurança da Kiki',
    description: 'Como a Kiki protege dados e contas na experiência de assistente pessoal com IA.',
    images: [defaultOgImage],
  },
};

export default function SegurancaPage() {
  return (
    <PageShell>
      <StructuredData
        data={breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Segurança', path: '/seguranca' }])}
      />
      <main className="public-detail-surface pt-24 md:pt-32 pb-16 px-4 md:px-6 bg-white">
        <article className="max-w-3xl mx-auto public-fade-up">
          <p className="text-sm font-semibold text-purple-700 mb-3">Confiança</p>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-5">Segurança</h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-10">
            A Kiki organiza informações importantes da rotina. Por isso, segurança, privacidade e controle de acesso são
            tratados como fundamentos do produto.
          </p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Proteção de conta</h2>
              <p>
                A autenticação da Kiki usa credenciais protegidas e controles para reduzir tentativas indevidas de
                acesso. Recomendamos o uso de senhas fortes e exclusivas.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Dados da rotina</h2>
              <p>
                Informações como tarefas, agenda, notas e lembretes são tratadas para entregar os recursos solicitados.
                O acesso a esses dados é limitado ao necessário para operação, suporte e melhoria do serviço.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Serviços de IA e voz</h2>
              <p>
                Alguns recursos podem usar provedores especializados de IA, voz, transcrição e notificações. A Kiki busca
                usar essas integrações de forma proporcional ao recurso solicitado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Monitoramento e prevenção</h2>
              <p>
                Podemos registrar eventos técnicos para investigar falhas, prevenir abusos, melhorar disponibilidade e
                proteger usuários contra comportamentos suspeitos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Boas práticas para usuários</h2>
              <p>
                Evite compartilhar sua senha, revise permissões de dispositivos e não insira dados sensíveis além do
                necessário. Para decisões críticas, revise sugestões geradas por IA antes de executar ações.
              </p>
            </section>
          </div>
        </article>
      </main>
    </PageShell>
  );
}
