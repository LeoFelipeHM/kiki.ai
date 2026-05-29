import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Loader2, Search } from 'lucide-react';
import { BlogContent } from '@/app/blog/BlogContent';
import type { BlogPost } from '@/app/blog/blog-types';
import { estimateReadingTime, formatDate, isPostPublishable } from '@/app/blog/blog-utils';
import { listPublishedBlogPosts, getPublishedBlogPost } from '@/services/blogPublic';
import logoMark from '@/logo.svg';

type LoadState =
  | { status: 'loading'; posts: BlogPost[]; post: BlogPost | null; message: string }
  | { status: 'ready'; posts: BlogPost[]; post: BlogPost | null; message: string }
  | { status: 'error'; posts: BlogPost[]; post: BlogPost | null; message: string };

export function PublicBlogPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<LoadState>({
    status: 'loading',
    posts: [],
    post: null,
    message: '',
  });

  const loadBlog = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', message: '' }));
    try {
      if (slug) {
        const post = await getPublishedBlogPost(slug);
        setState({ status: 'ready', posts: [], post, message: '' });
        return;
      }

      const posts = (await listPublishedBlogPosts()).filter(
        (post) => post.status === 'published' && isPostPublishable(post.publishedAt),
      );
      setState({ status: 'ready', posts, post: null, message: '' });
    } catch (error) {
      setState({
        status: 'error',
        posts: [],
        post: null,
        message: error instanceof Error ? error.message : 'Nao foi possivel carregar o blog.',
      });
    }
  }, [slug]);

  useEffect(() => {
    void loadBlog();
  }, [loadBlog]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return state.posts;
    return state.posts.filter((post) =>
      [post.title, post.summary, post.category, post.author, post.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, state.posts]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80">
            <img src={logoMark} alt="" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-xl font-semibold">Kiki</span>
          </button>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
              Inicio
            </Link>
            <Link to="/blog" className="rounded-lg bg-gray-50 px-3 py-2 font-medium text-gray-900">
              Blog
            </Link>
            <Link to="/login" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {slug ? (
        <ArticleView state={state} onRetry={loadBlog} />
      ) : (
        <BlogListView
          state={state}
          posts={filteredPosts}
          query={query}
          onQueryChange={setQuery}
          onRetry={loadBlog}
        />
      )}
    </div>
  );
}

function BlogListView({
  state,
  posts,
  query,
  onQueryChange,
  onRetry,
}: {
  state: LoadState;
  posts: BlogPost[];
  query: string;
  onQueryChange: (value: string) => void;
  onRetry: () => void;
}) {
  return (
    <main className="pb-16">
      <section className="mx-auto max-w-6xl px-5 pt-12 md:px-8 md:pt-16">
        <div className="mb-8 flex flex-col gap-8">
          <h1 className="text-6xl font-bold tracking-tight text-purple-700 md:text-7xl">Blog</h1>
          <div className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <Search className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar artigos"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {state.status === 'loading' ? <LoadingBlock label="Carregando artigos..." /> : null}
        {state.status === 'error' ? <ErrorBlock message={state.message} onRetry={onRetry} /> : null}
        {state.status === 'ready' && posts.length === 0 ? <EmptyBlock hasQuery={query.trim().length > 0} /> : null}

        {posts.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-xl hover:shadow-gray-900/5">
      {post.coverImage ? (
        <img src={post.coverImage} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            {post.category}
          </span>
          <span className="text-xs text-gray-500">{estimateReadingTime(post.content)} min de leitura</span>
        </div>
        <h2 className="mb-3 text-xl font-bold leading-tight text-gray-900">{post.title}</h2>
        <p className="mb-4 line-clamp-3 text-sm leading-6 text-gray-600">{post.summary}</p>
        <div className="mt-auto space-y-4">
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(post.publishedAt)}
            </span>
            <span>{post.author}</span>
          </div>
          <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-pink-600">
            Ler artigo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ArticleView({ state, onRetry }: { state: LoadState; onRetry: () => void }) {
  if (state.status === 'loading') {
    return (
      <main className="px-5 py-20 md:px-8">
        <LoadingBlock label="Carregando artigo..." />
      </main>
    );
  }

  if (state.status === 'error' || !state.post) {
    return (
      <main className="px-5 py-20 md:px-8">
        <ErrorBlock message={state.message || 'Artigo nao encontrado.'} onRetry={onRetry} />
      </main>
    );
  }

  const post = state.post;

  return (
    <main className="pb-16">
      <article className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        <Link to="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-pink-600">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para o blog
        </Link>

        <header className="mb-10">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              {post.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {estimateReadingTime(post.content)} min de leitura
            </span>
          </div>
          <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
            {post.title}
          </h1>
          <p className="mb-6 text-lg leading-8 text-gray-600 md:text-xl">{post.summary}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{post.author}</span>
            <span aria-hidden="true">-</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </div>
        </header>

        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt=""
            className="mb-10 aspect-[16/9] w-full rounded-2xl border border-gray-100 object-cover shadow-xl shadow-purple-900/5"
          />
        ) : null}

        <BlogContent content={post.content} />

        {post.tags.length > 0 ? (
          <footer className="mt-10 border-t border-gray-100 pt-8">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Tags</h2>
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
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-sm text-gray-600">
      <Loader2 className="h-5 w-5 animate-spin text-purple-600" aria-hidden="true" />
      {label}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
      <h2 className="mb-2 text-xl font-bold text-red-950">Nao foi possivel carregar</h2>
      <p className="mb-5 text-sm text-red-800">{message}</p>
      <button type="button" onClick={onRetry} className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">
        Tentar novamente
      </button>
    </div>
  );
}

function EmptyBlock({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        {hasQuery ? 'Nenhum artigo encontrado' : 'Nenhum artigo publicado ainda'}
      </h2>
      <p className="text-sm text-gray-600">
        {hasQuery ? 'Tente buscar por outro termo.' : 'Quando um post for publicado no admin, ele aparecera aqui.'}
      </p>
    </div>
  );
}
