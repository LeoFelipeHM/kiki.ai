import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { BlogPost, BlogPostInput } from './blog-types';
import { isPostPublishable, parseTags, slugify, sortPostsByDate } from './blog-utils';

const fallbackFile = path.join(process.cwd(), 'data', 'blog-posts.json');

function postsFilePath() {
  if (!process.env.BLOG_POSTS_FILE) return fallbackFile;
  return path.join(process.cwd(), 'data', path.basename(process.env.BLOG_POSTS_FILE));
}

async function ensurePostsFile() {
  const filePath = postsFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]\n', 'utf-8');
  }
}

export async function readBlogPosts() {
  await ensurePostsFile();
  const raw = await fs.readFile(postsFilePath(), 'utf-8');
  const posts = JSON.parse(raw) as BlogPost[];
  return sortPostsByDate(posts);
}

async function writeBlogPosts(posts: BlogPost[]) {
  await ensurePostsFile();
  await fs.writeFile(postsFilePath(), `${JSON.stringify(sortPostsByDate(posts), null, 2)}\n`, 'utf-8');
}

export async function getPublishedPosts() {
  const posts = await readBlogPosts();
  return posts.filter((post) => post.status === 'published' && isPostPublishable(post.publishedAt));
}

export async function getPostBySlug(slug: string, includeDrafts = false) {
  const posts = await readBlogPosts();
  return (
    posts.find(
      (post) =>
        post.slug === slug &&
        (includeDrafts || (post.status === 'published' && isPostPublishable(post.publishedAt))),
    ) ?? null
  );
}

export async function createBlogPost(input: BlogPostInput) {
  const posts = await readBlogPosts();
  const now = new Date().toISOString();
  const baseSlug = slugify(input.slug || input.title);
  const slug = uniqueSlug(baseSlug, posts);
  const post: BlogPost = {
    id: randomUUID(),
    title: input.title.trim(),
    slug,
    summary: input.summary.trim(),
    content: input.content.trim(),
    category: input.category.trim() || 'Kiki',
    tags: parseTags(input.tags),
    coverImage: input.coverImage?.trim() || '',
    status: input.status,
    author: input.author?.trim() || 'Time Kiki',
    publishedAt: normalizePublishedAt(input.publishedAt) || now,
    createdAt: now,
    updatedAt: now,
  };
  await writeBlogPosts([post, ...posts]);
  return post;
}

export async function updateBlogPost(id: string, input: BlogPostInput) {
  const posts = await readBlogPosts();
  const current = posts.find((post) => post.id === id);
  if (!current) return null;

  const requestedSlug = slugify(input.slug || input.title);
  const slug = uniqueSlug(requestedSlug, posts.filter((post) => post.id !== id));
  const updated: BlogPost = {
    ...current,
    title: input.title.trim(),
    slug,
    summary: input.summary.trim(),
    content: input.content.trim(),
    category: input.category.trim() || 'Kiki',
    tags: parseTags(input.tags),
    coverImage: input.coverImage?.trim() || '',
    status: input.status,
    author: input.author?.trim() || current.author || 'Time Kiki',
    publishedAt: normalizePublishedAt(input.publishedAt) || current.publishedAt,
    updatedAt: new Date().toISOString(),
  };
  await writeBlogPosts(posts.map((post) => (post.id === id ? updated : post)));
  return updated;
}

export async function deleteBlogPost(id: string) {
  const posts = await readBlogPosts();
  const nextPosts = posts.filter((post) => post.id !== id);
  if (nextPosts.length === posts.length) return false;
  await writeBlogPosts(nextPosts);
  return true;
}

function uniqueSlug(baseSlug: string, posts: BlogPost[]) {
  const fallback = baseSlug || 'post';
  const used = new Set(posts.map((post) => post.slug));
  if (!used.has(fallback)) return fallback;
  let index = 2;
  while (used.has(`${fallback}-${index}`)) index += 1;
  return `${fallback}-${index}`;
}

function normalizePublishedAt(value?: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00`;
  return value;
}
