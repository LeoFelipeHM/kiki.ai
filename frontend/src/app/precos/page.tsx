import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckList, PageShell } from '../public-site/components';
import { plans, pricingFaqs } from '../public-site/data';
import { dashboardRoutes } from '../public-site/routes';
import { breadcrumbJsonLd, defaultOgImage, faqJsonLd, StructuredData } from '../public-site/seo';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Preços da Kiki: plano grátis e Pro para organizar sua rotina',
  description: 'Compare os planos da Kiki para organizar sua rotina com IA, incluindo plano grátis, Kiki Pro e opções para empresas.',
  alternates: { canonical: '/precos' },
  openGraph: {
    title: 'Preços da Kiki',
    description: 'Escolha entre plano grátis, Kiki Pro e Enterprise para organizar sua rotina com IA.',
    url: '/precos',
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: 'Preços e planos da Kiki' }],
  },
  twitter: {
    title: 'Preços da Kiki',
    description: 'Escolha entre plano grátis, Kiki Pro e Enterprise para organizar sua rotina com IA.',
    images: [defaultOgImage],
  },
};

export default function PrecosPage() {
  return (
    <PageShell>
      <StructuredData data={[breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Preços', path: '/precos' }]), faqJsonLd(pricingFaqs)]} />
      <main className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 public-detail-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16 public-fade-up">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 text-gray-900 px-2">
              Escolha seu plano
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-600">Comece grátis e evolua quando precisar</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto mb-10 md:mb-16">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl md:rounded-3xl p-6 md:p-8 transition-all public-card-motion ${
                  plan.featured ? 'border-2 border-purple-600 relative shadow-lg' : 'border border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.featured ? (
                  <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs md:text-sm font-medium rounded-full">
                    Recomendado
                  </div>
                ) : null}
                <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-gray-900">{plan.name}</h2>
                <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">{plan.description}</p>
                <div className="mb-4 md:mb-6">
                  <span className={plan.price === 'Personalizado' ? 'text-2xl md:text-3xl font-bold text-gray-900' : 'text-4xl md:text-5xl font-bold text-gray-900'}>
                    {plan.price}
                  </span>
                  {plan.price.startsWith('R$') ? <span className="text-sm md:text-base text-gray-600">/mês</span> : null}
                </div>
                <Link
                  href={dashboardRoutes.signup}
                  className={`block w-full py-2.5 md:py-3 px-6 text-center rounded-full font-medium transition-all mb-4 md:mb-6 text-sm md:text-base ${
                    plan.featured ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {plan.cta}
                </Link>
                <CheckList items={plan.checks} featured={plan.featured} />
              </div>
            ))}
          </div>

          <div className="text-center mb-8 md:mb-12">
            <p className="text-xs md:text-sm text-gray-600 mb-6 md:mb-8 px-4">
              Todos os planos incluem: Segurança de dados, Suporte técnico, Atualizações gratuitas
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-900 text-center px-4">
              Perguntas frequentes
            </h2>
            <div className="space-y-4 md:space-y-6 public-fade-up">
              {pricingFaqs.map((faq) => (
                <div key={faq.question} className="bg-white border border-gray-200 rounded-xl md:rounded-2xl p-4 md:p-6 public-card-motion">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600 text-xs md:text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
