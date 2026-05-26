import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const blogAdminCookieName = 'kiki_blog_admin';

function adminUsername() {
  return process.env.BLOG_ADMIN_USERNAME || 'founder';
}

function adminPassword() {
  return process.env.BLOG_ADMIN_PASSWORD || '';
}

function adminSecret() {
  return process.env.BLOG_ADMIN_SECRET || process.env.BLOG_ADMIN_PASSWORD || '';
}

export function isBlogAdminConfigured() {
  return Boolean(adminPassword() && adminSecret());
}

export function validateBlogAdminCredentials(username: string, password: string) {
  return isBlogAdminConfigured() && username === adminUsername() && password === adminPassword();
}

export function createBlogAdminToken() {
  return createHmac('sha256', adminSecret()).update(`blog-admin:${adminUsername()}`).digest('hex');
}

export async function isBlogAdminAuthenticated() {
  if (!isBlogAdminConfigured()) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(blogAdminCookieName)?.value;
  if (!token) return false;

  const expected = createBlogAdminToken();
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}
