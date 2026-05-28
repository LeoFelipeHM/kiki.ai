import type { BlogPost, BlogPostInput } from './blog-types';

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function parseTags(tags: BlogPostInput['tags']) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }
  if (!tags) return [];
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function estimateReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDate(date: string) {
  const hasTime = date.includes('T');
  const parsedDate = new Date(hasTime ? date : `${date}T00:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsedDate);
}

export function isPostPublishable(date: string, now = new Date()) {
  return new Date(date.includes('T') ? date : `${date}T00:00:00`).getTime() <= now.getTime();
}

export function sortPostsByDate(posts: BlogPost[]) {
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime(),
  );
}
