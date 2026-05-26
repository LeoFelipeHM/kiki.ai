export const publicRoutes = [
  { href: '/', label: 'Início' },
  { href: '/recursos', label: 'Recursos' },
  { href: '/como-funciona', label: 'Como funciona' },
  { href: '/precos', label: 'Preços' },
  { href: '/blog', label: 'Blog' },
  { href: '/cadastro', label: 'Começar grátis' },
] as const;

export const dashboardRoutes = {
  login: '/login',
} as const;
