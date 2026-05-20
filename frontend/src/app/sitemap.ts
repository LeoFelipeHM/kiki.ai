import type { MetadataRoute } from 'next';
import { publicRoutes } from './public-site/routes';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://heykiki.com.br';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.href}`,
    lastModified: new Date(),
    changeFrequency: route.href === '/' ? 'weekly' : 'monthly',
    priority: route.href === '/' ? 1 : 0.8,
  }));
}
