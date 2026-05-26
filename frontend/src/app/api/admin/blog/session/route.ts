import { NextResponse } from 'next/server';
import {
  blogAdminCookieName,
  createBlogAdminToken,
  isBlogAdminConfigured,
  validateBlogAdminCredentials,
} from '../../../../admin/blog/auth';

export async function POST(request: Request) {
  if (!isBlogAdminConfigured()) {
    return NextResponse.json(
      { error: 'Configure BLOG_ADMIN_PASSWORD e BLOG_ADMIN_SECRET no ambiente.' },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { username?: string; password?: string };
  if (!validateBlogAdminCredentials(body.username || '', body.password || '')) {
    return NextResponse.json({ error: 'Login ou senha inválidos.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(blogAdminCookieName, createBlogAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(blogAdminCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
