import { NextResponse } from 'next/server';
import { isBlogAdminAuthenticated } from '../../../../../admin/blog/auth';
import { deleteBlogPost, updateBlogPost } from '../../../../../blog/blog-store';
import type { BlogPostInput } from '../../../../../blog/blog-types';

type PostRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: PostRouteProps) {
  if (!(await isBlogAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { id } = await params;
  const input = (await request.json()) as BlogPostInput;
  const post = await updateBlogPost(id, input);
  if (!post) return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
  return NextResponse.json({ post });
}

export async function DELETE(_request: Request, { params }: PostRouteProps) {
  if (!(await isBlogAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteBlogPost(id);
  if (!deleted) return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
