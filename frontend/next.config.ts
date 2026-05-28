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
  async rewrites() {
    const dashboardOrigin = process.env.DASHBOARD_ORIGIN;
    if (!dashboardOrigin) return [];

    return [
      { source: '/login', destination: `${dashboardOrigin}/login` },
      { source: '/home', destination: `${dashboardOrigin}/home` },
      { source: '/chat', destination: `${dashboardOrigin}/chat` },
      { source: '/calendar', destination: `${dashboardOrigin}/calendar` },
      { source: '/notes', destination: `${dashboardOrigin}/notes` },
      { source: '/contacts', destination: `${dashboardOrigin}/contacts` },
      { source: '/settings', destination: `${dashboardOrigin}/settings` },
      { source: '/profile/:path*', destination: `${dashboardOrigin}/profile/:path*` },
      { source: '/integracao/:path*', destination: `${dashboardOrigin}/integracao/:path*` },
      { source: '/admin/:path*', destination: `${dashboardOrigin}/admin/:path*` },
    ];
  },
};

export default nextConfig;
