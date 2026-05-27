import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Blog',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminBlogPage() {
  redirect('/login');
}
