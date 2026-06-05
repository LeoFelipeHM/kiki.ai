import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async redirects() {
    const dashboardOrigin = process.env.DASHBOARD_ORIGIN ?? process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN ?? 'https://app.heykiki.com.br';

    return [
      { source: '/cadastro', destination: `${dashboardOrigin}/login`, permanent: false },
      { source: '/login', destination: `${dashboardOrigin}/login`, permanent: false },
      { source: '/home', destination: `${dashboardOrigin}/home`, permanent: false },
      { source: '/chat', destination: `${dashboardOrigin}/chat`, permanent: false },
      { source: '/agents/:path*', destination: `${dashboardOrigin}/agents/:path*`, permanent: false },
      { source: '/calendar', destination: `${dashboardOrigin}/calendar`, permanent: false },
      { source: '/notes', destination: `${dashboardOrigin}/notes`, permanent: false },
      { source: '/contacts', destination: `${dashboardOrigin}/contacts`, permanent: false },
      { source: '/settings', destination: `${dashboardOrigin}/settings`, permanent: false },
      { source: '/profile/:path*', destination: `${dashboardOrigin}/profile/:path*`, permanent: false },
      { source: '/integracao/:path*', destination: `${dashboardOrigin}/integracao/:path*`, permanent: false },
      { source: '/admin/:path*', destination: `${dashboardOrigin}/admin/:path*`, permanent: false },
    ];
  },
};

export default nextConfig;
