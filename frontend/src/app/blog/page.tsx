import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, PageShell, SectionHeader } from '../public-site/components';
import { getPublishedPosts } from './blog-store';
import { estimateReadingTime, formatDate } from './blog-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Artigos da Kiki sobre organização, produtividade, IA pessoal e rotinas mais claras.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog da Kiki',
    description: 'Conteúdos sobre organização, produtividade e IA pessoal.',
    url: '/blog',
  },
  twitter: {
    title: 'Blog da Kiki',
    description: 'Conteúdos sobre organização, produtividade e IA pessoal.',
  },
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <PageShell>
      <main className="pt-24 md:pt-32 pb-16 bg-white">
        <SectionHeader
          eyebrow="Blog"
          title="Ideias para uma rotina mais leve"
          description="Conteúdos práticos sobre organização, produtividade e formas inteligentes de cuidar do dia a dia."
        />

        <section className="max-w-6xl mx-auto px-4 md:px-6">
          {posts.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhum artigo publicado ainda</h2>
              <p className="text-gray-600">Volte em breve para ler as novidades da Kiki.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {posts.map((post) => (
                <Card key={post.id}>
                  {post.coverImage ? (
                    <div className="relative -mx-6 -mt-6 mb-5 aspect-[16/10] overflow-hidden rounded-t-2xl md:-mx-8 md:-mt-8 md:rounded-t-3xl">
                      <Image
                        src={post.coverImage}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-500">{estimateReadingTime(post.content)} min de leitura</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 leading-tight">{post.title}</h2>
                  <p className="text-sm text-gray-500 mb-3">{formatDate(post.publishedAt)}</p>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-6">{post.summary}</p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-pink-600 transition-colors"
                  >
                    Ler artigo
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}
