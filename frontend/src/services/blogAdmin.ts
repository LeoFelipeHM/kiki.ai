import { authorizedFetch, parseFastApiDetail } from './auth';
import type { BlogPost, BlogPostInput } from '@/app/blog/blog-types';

export type BlogMetricSummary = {
  postId: string;
  slug: string;
  impressions: number;
  clicks: number;
  views: number;
  ctaClicks: number;
  totalReadSeconds: number;
  readSamples: number;
  averageReadSeconds: number;
  lastEventAt: string;
};

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Erro na requisição');
}

export async function listAdminBlogPosts(): Promise<BlogPost[]> {
  const res = await authorizedFetch('/admin/blog/posts');
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createAdminBlogPost(input: BlogPostInput): Promise<BlogPost> {
  const res = await authorizedFetch('/admin/blog/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateAdminBlogPost(postId: string, input: BlogPostInput): Promise<BlogPost> {
  const res = await authorizedFetch(`/admin/blog/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteAdminBlogPost(postId: string): Promise<void> {
  const res = await authorizedFetch(`/admin/blog/posts/${postId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function uploadAdminBlogCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await authorizedFetch('/admin/blog/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function listAdminBlogMetrics(): Promise<BlogMetricSummary[]> {
  const res = await authorizedFetch('/admin/blog/metrics');
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
