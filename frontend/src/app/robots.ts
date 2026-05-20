import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://heykiki.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/home', '/chat', '/calendar', '/notes', '/contacts', '/settings', '/profile', '/admin'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
