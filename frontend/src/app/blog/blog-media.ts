import { API_BASE_URL } from '@/services/auth';

export function resolveBlogImageUrl(value?: string | null) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/blog-images/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

export function resolveBlogContentImages(content: string) {
  return content.replace(/(src=["'])\/blog-images\//gi, `$1${API_BASE_URL}/blog-images/`);
}
