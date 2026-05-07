/**
 * URLs canônicas da aplicação (sem React).
 * Importe de `@/navigation/routes` ou `@/root.paths`.
 */
export const ROUTES = {
  login: '/login',
  home: '/home',
  chat: '/chat',
  calendar: '/calendar',
  notes: '/notes',
  settings: '/settings',
  profile: '/profile',
  profilePhoto: '/profile/foto',
  profileEdit: (slug: string) => `/profile/editar/${slug}`,
  profilePassword: '/profile/senha',
  profileNotifications: '/profile/notificacoes',
  profilePrivacy: '/profile/privacidade',
  profileDeleteAccount: '/profile/privacidade/excluir-conta',
  profileSubscription: '/profile/assinatura',
  integration: (slug: string) => `/integracao/${slug}`,
  adminUsers: '/admin/usuarios',
} as const;

/** Rotas com parâmetros (pattern React Router) */
export const ROUTE_PATTERNS = {
  profileEdit: '/profile/editar/:slug',
  integration: '/integracao/:slug',
} as const;
