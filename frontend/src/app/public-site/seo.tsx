type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | {
      [key: string]: JsonLdValue;
    };

type BreadcrumbItem = {
  name: string;
  path: string;
};

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://heykiki.com.br';
export const defaultOgImage = '/og-kiki.png';

export function absoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function StructuredData({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kiki',
    url: siteUrl,
    logo: absoluteUrl('/apple-touch-icon.png'),
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kiki',
    url: siteUrl,
    inLanguage: 'pt-BR',
    publisher: {
      '@type': 'Organization',
      name: 'Kiki',
      logo: absoluteUrl('/apple-touch-icon.png'),
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kiki',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web, iOS, Android',
    url: siteUrl,
    image: absoluteUrl(defaultOgImage),
    description:
      'Assistente pessoal com IA para organizar agenda, tarefas, lembretes, notas e agentes autônomos.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: absoluteUrl('/cadastro'),
    },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(items: readonly { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
