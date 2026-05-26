import type { MetadataRoute } from 'next';
import { getPublishedPosts } from './blog/blog-store';
import { publicRoutes } from './public-site/routes';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://heykiki.com.br';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const publicPages = publicRoutes.map((route) => ({
    url: `${siteUrl}${route.href}`,
    lastModified: new Date(),
    changeFrequency: (route.href === '/' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    priority: route.href === '/' ? 1 : 0.8,
  }));

  const blogPosts = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...publicPages, ...blogPosts];
}
