import { NextResponse } from 'next/server';
import { isBlogAdminAuthenticated } from '../../../../admin/blog/auth';
import { createBlogPost, readBlogPosts } from '../../../../blog/blog-store';
import type { BlogPostInput } from '../../../../blog/blog-types';

export async function GET() {
  if (!(await isBlogAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  return NextResponse.json({ posts: await readBlogPosts() });
}

export async function POST(request: Request) {
  if (!(await isBlogAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const input = (await request.json()) as BlogPostInput;
  const post = await createBlogPost(input);
  return NextResponse.json({ post }, { status: 201 });
}
