import type { Metadata } from 'next';
import { PageShell } from '../public-site/components';
import { breadcrumbJsonLd, defaultOgImage, StructuredData } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description:
    'Leia os termos de uso da Kiki, assistente pessoal com IA para organizar agenda, tarefas, lembretes, notas e agentes.',
  alternates: { canonical: '/termos' },
  openGraph: {
    title: 'Termos de Uso da Kiki',
    description: 'Condições para usar a Kiki e seus recursos de organização com IA.',
    url: '/termos',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Termos de Uso da Kiki' }],
  },
  twitter: {
    title: 'Termos de Uso da Kiki',
    description: 'Condições para usar a Kiki e seus recursos de organização com IA.',
    images: [defaultOgImage],
  },
};

export default function TermosPage() {
  return (
    <PageShell>
      <StructuredData data={breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Termos', path: '/termos' }])} />
      <main className="public-detail-surface pt-24 md:pt-32 pb-16 px-4 md:px-6 bg-white">
        <article className="max-w-3xl mx-auto public-fade-up">
          <p className="text-sm font-semibold text-purple-700 mb-3">Legal</p>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-5">Termos de Uso</h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-10">
            Estes termos descrevem as condições gerais para uso da Kiki, uma assistente pessoal com IA para organizar
            agenda, tarefas, lembretes, notas e agentes que trabalham em segundo plano.
          </p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Uso da Kiki</h2>
              <p>
                Você deve usar a Kiki de forma responsável, respeitando leis aplicáveis, direitos de terceiros e limites
                técnicos do serviço. Alguns recursos podem depender de disponibilidade de provedores externos,
                conectividade, permissões do dispositivo e configurações da conta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Conta e segurança</h2>
              <p>
                Você é responsável por manter suas credenciais protegidas e por atividades realizadas na sua conta. Caso
                suspeite de acesso indevido, altere sua senha e entre em contato pelos canais oficiais.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Conteúdo do usuário</h2>
              <p>
                Tarefas, notas, eventos, mensagens e outros conteúdos inseridos continuam sob sua responsabilidade. A
                Kiki usa essas informações para entregar a experiência solicitada e organizar sua rotina.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Recursos com IA</h2>
              <p>
                Respostas e sugestões geradas por IA podem conter imprecisões. Use a Kiki como apoio para organização e
                produtividade, revisando decisões importantes antes de agir, especialmente em contextos médicos,
                jurídicos, financeiros ou de segurança.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Planos e disponibilidade</h2>
              <p>
                Planos, limites, preços e funcionalidades podem variar ao longo do tempo. A Kiki pode ajustar recursos,
                corrigir falhas, suspender funcionalidades ou alterar condições comerciais quando necessário.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Alterações nos termos</h2>
              <p>
                Estes termos podem ser atualizados para refletir mudanças no produto ou requisitos legais. O uso
                contínuo da Kiki após atualizações indica concordância com a versão vigente.
              </p>
            </section>
          </div>
        </article>
      </main>
    </PageShell>
  );
}
