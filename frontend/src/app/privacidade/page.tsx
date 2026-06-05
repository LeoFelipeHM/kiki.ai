import type { Metadata } from 'next';
import { PageShell } from '../public-site/components';
import { breadcrumbJsonLd, defaultOgImage, StructuredData } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Entenda como a Kiki trata dados pessoais, informações de agenda, tarefas, notas e preferências usadas pela assistente com IA.',
  alternates: { canonical: '/privacidade' },
  openGraph: {
    title: 'Política de Privacidade da Kiki',
    description: 'Saiba como a Kiki protege e usa dados para organizar sua rotina com IA.',
    url: '/privacidade',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Política de Privacidade da Kiki' }],
  },
  twitter: {
    title: 'Política de Privacidade da Kiki',
    description: 'Saiba como a Kiki protege e usa dados para organizar sua rotina com IA.',
    images: [defaultOgImage],
  },
};

export default function PrivacidadePage() {
  return (
    <PageShell>
      <StructuredData
        data={breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Privacidade', path: '/privacidade' }])}
      />
      <main className="public-detail-surface pt-24 md:pt-32 pb-16 px-4 md:px-6 bg-white">
        <article className="max-w-3xl mx-auto public-fade-up">
          <p className="text-sm font-semibold text-purple-700 mb-3">Legal</p>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-5">Política de Privacidade</h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-10">
            A Kiki foi criada para organizar sua rotina com IA. Esta política explica, em linguagem simples, como
            tratamos informações relacionadas a conta, agenda, tarefas, lembretes, notas, conversas e preferências.
          </p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Dados que podemos tratar</h2>
              <p>
                Podemos tratar dados fornecidos por você, como nome, e-mail, preferências, conteúdos de tarefas, eventos,
                notas e mensagens enviadas para a assistente. Também podemos registrar dados técnicos necessários para
                segurança, autenticação, funcionamento do aplicativo e prevenção de abuso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Como usamos essas informações</h2>
              <p>
                Usamos os dados para entregar os recursos da Kiki, organizar sua rotina, gerar lembretes, responder
                comandos, personalizar sugestões, manter a conta segura, corrigir falhas e melhorar a experiência do
                produto.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Compartilhamento e integrações</h2>
              <p>
                Quando recursos externos são usados, como serviços de IA, notificações, voz ou integrações futuras,
                algumas informações podem ser processadas por provedores necessários para executar a funcionalidade. A
                Kiki evita compartilhamentos desnecessários e usa essas integrações para viabilizar o serviço solicitado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Segurança</h2>
              <p>
                Aplicamos medidas técnicas e organizacionais para proteger dados contra acesso indevido, perda,
                alteração ou uso não autorizado. Nenhum sistema é completamente imune a riscos, mas segurança é tratada
                como parte central do produto.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Seus direitos</h2>
              <p>
                Você pode solicitar acesso, correção, exclusão ou revisão de informações pessoais, conforme a legislação
                aplicável. Para dúvidas sobre privacidade, use o canal oficial de contato da Kiki.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Atualizações</h2>
              <p>
                Esta política pode ser atualizada para refletir mudanças no produto, em integrações ou em exigências
                legais. A versão mais recente estará sempre disponível nesta página.
              </p>
            </section>
          </div>
        </article>
      </main>
    </PageShell>
  );
}
