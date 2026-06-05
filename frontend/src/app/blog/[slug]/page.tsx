import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageShell } from '../../public-site/components';
import { BlogContent } from '../BlogContent';
import { BlogArticleMetrics } from '../BlogMetricsTracker';
import { getPostBySlug, getPublishedPosts } from '../blog-store';
import { estimateReadingTime, formatDate } from '../blog-utils';
import { absoluteUrl, defaultOgImage, StructuredData } from '../../public-site/seo';

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Artigo não encontrado',
    };
  }

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.summary,
      url: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: post.coverImage || defaultOgImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      title: post.title,
      description: post.summary,
      images: [post.coverImage || defaultOgImage],
    },
  };
}

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <PageShell>
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.summary,
          image: absoluteUrl(post.coverImage || defaultOgImage),
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: {
            '@type': 'Organization',
            name: post.author,
          },
          publisher: {
            '@type': 'Organization',
            name: 'Kiki',
            logo: {
              '@type': 'ImageObject',
              url: absoluteUrl('/apple-touch-icon.png'),
            },
          },
          mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
          keywords: post.tags.join(', '),
        }}
      />
      <BlogArticleMetrics postId={post.id} slug={post.slug} />
      <main className="public-detail-surface pt-24 md:pt-32 pb-16 bg-white">
        <article className="max-w-3xl mx-auto px-4 md:px-6 public-fade-up">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-pink-600 mb-8">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar para o blog
          </Link>

          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                {post.category}
              </span>
              <span className="text-sm text-gray-500">{estimateReadingTime(post.content)} min de leitura</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-5">
              {post.title}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6">{post.summary}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>{post.author}</span>
              <span aria-hidden="true">•</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </div>
          </header>

          {post.coverImage ? (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-3xl border border-gray-100 shadow-xl shadow-purple-900/5">
              <Image
                src={post.coverImage}
                alt=""
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                priority
                className="object-cover"
              />
            </div>
          ) : null}

          <BlogContent content={post.content} />

          {post.tags.length > 0 ? (
            <footer className="mt-10 pt-8 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            </footer>
          ) : null}
        </article>
      </main>
    </PageShell>
  );
}
