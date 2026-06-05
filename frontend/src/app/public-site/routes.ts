export const publicRoutes = [
  { href: '/', label: 'Início' },
  { href: '/agentes', label: 'Agentes' },
  { href: '/recursos', label: 'Recursos' },
  { href: '/como-funciona', label: 'Como funciona' },
  { href: '/precos', label: 'Preços' },
  { href: '/blog', label: 'Blog' },
  { href: '/cadastro', label: 'Começar grátis' },
  { href: '/privacidade', label: 'Privacidade' },
  { href: '/termos', label: 'Termos' },
  { href: '/seguranca', label: 'Segurança' },
] as const;

export const dashboardOrigin = process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN ?? 'https://app.heykiki.com.br';

export const dashboardRoutes = {
  login: `${dashboardOrigin}/login`,
  signup: `${dashboardOrigin}/login`,
} as const;
