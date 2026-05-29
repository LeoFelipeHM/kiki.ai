import type { BlogPost } from '@/app/blog/blog-types';
import { isPostPublishable, sortPostsByDate } from '@/app/blog/blog-utils';
import { API_BASE_URL, parseFastApiDetail } from './auth';
import localBlogPosts from '../../data/blog-posts.json';

const connectionErrorMessage =
  'Nao foi possivel conectar ao servidor do blog. Verifique se o backend esta rodando e atualizado.';

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Nao foi possivel carregar o blog.');
}

export async function listPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/blog/posts`);
    if (res.status === 404) return getLocalPublishedPosts();
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
    return getLocalPublishedPosts();
  }
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPost> {
  try {
    const res = await fetch(`${API_BASE_URL}/blog/posts/${encodeURIComponent(slug)}`);
    if (res.status === 404) return getLocalPublishedPost(slug);
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
    return getLocalPublishedPost(slug);
  }
}

function getLocalPublishedPosts() {
  return sortPostsByDate(
    (localBlogPosts as BlogPost[]).filter(
      (post) => post.status === 'published' && isPostPublishable(post.publishedAt),
    ),
  );
}

function getLocalPublishedPost(slug: string) {
  const post = getLocalPublishedPosts().find((item) => item.slug === slug);
  if (!post) throw new Error(connectionErrorMessage);
  return post;
}
