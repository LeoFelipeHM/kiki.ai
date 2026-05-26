import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { isBlogAdminAuthenticated } from '../../../../admin/blog/auth';
import { slugify } from '../../../../blog/blog-utils';

const maxImageSize = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export async function POST(request: Request) {
  if (!(await isBlogAdminAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('image');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Envie uma imagem válida.' }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: 'Use JPG, PNG, WebP ou GIF.' }, { status: 400 });
  }

  if (file.size > maxImageSize) {
    return NextResponse.json({ error: 'A imagem deve ter no máximo 5 MB.' }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  const originalName = file.name.replace(/\.[^.]+$/, '');
  const safeName = slugify(originalName) || 'imagem-blog';
  const fileName = `${safeName}-${Date.now()}.${extension}`;
  const uploadDir = path.join(process.cwd(), 'public', 'blog-images');
  const filePath = path.join(uploadDir, fileName);

  await fs.mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(bytes));

  return NextResponse.json({ url: `/blog-images/${fileName}` });
}
