import type { Metadata } from 'next';
import { readBlogPosts } from '../../blog/blog-store';
import { AdminLogin } from './AdminLogin';
import { BlogAdminPanel } from './BlogAdminPanel';
import { isBlogAdminAuthenticated, isBlogAdminConfigured } from './auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Blog',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminBlogPage() {
  const isAuthenticated = await isBlogAdminAuthenticated();

  if (!isAuthenticated) {
    return <AdminLogin isConfigured={isBlogAdminConfigured()} />;
  }

  const posts = await readBlogPosts();
  return <BlogAdminPanel initialPosts={posts} />;
}
