import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  BarChart3,
  CalendarClock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Menu,
  MousePointerClick,
  Plus,
  Search,
  Send,
  Tags,
  Trash2,
  Upload,
} from 'lucide-react';
import type { BlogPost, BlogPostStatus } from '@/app/blog/blog-types';
import { formatDate, isPostPublishable, slugify } from '@/app/blog/blog-utils';
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  listAdminBlogMetrics,
  listAdminBlogPosts,
  type BlogMetricSummary,
  updateAdminBlogPost,
  uploadAdminBlogCover,
} from '@/services/blogAdmin';
import { AuthSessionExpiredError } from '@/services/auth';

type FormState = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string;
  coverImage: string;
  status: BlogPostStatus;
  author: string;
  publishedAt: string;
};

const emptyForm: FormState = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  category: 'Produtividade',
  tags: '',
  coverImage: '',
  status: 'draft',
  author: 'Time Kiki',
  publishedAt: toDatetimeLocalValue(new Date()),
};

function publicBlogUrl() {
  if (typeof window === 'undefined') return '/blog';
  const { protocol, hostname, port, origin } = window.location;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173') {
    return `${protocol}//${hostname}:3000/blog`;
  }
  return `${origin}/blog`;
}

export function BlogAdminScreen({
  onOpenMenu,
  onSessionExpired,
}: {
  onOpenMenu: () => void;
  onSessionExpired: () => void;
}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [metrics, setMetrics] = useState<BlogMetricSummary[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | 'all'>('all');
  const blogUrl = publicBlogUrl();

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [posts],
  );

  const visiblePosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedPosts.filter((post) => {
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesQuery = !query || [
        post.title,
        post.summary,
        post.slug,
        post.category,
        post.author,
        post.tags.join(' '),
      ].join(' ').toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [searchTerm, sortedPosts, statusFilter]);

  const handleError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof AuthSessionExpiredError) {
      onSessionExpired();
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }, [onSessionExpired]);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setPosts(await listAdminBlogPosts());
      setMetrics(await listAdminBlogMetrics());
    } catch (err) {
      handleError(err, 'Não foi possível carregar os posts.');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => {
      if (key === 'title' && (!current.slug || current.slug === slugify(current.title))) {
        return { ...current, title: value as string, slug: slugify(value as string) };
      }
      return { ...current, [key]: value };
    });
  }

  function editPost(post: BlogPost) {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      content: post.content,
      category: post.category,
      tags: post.tags.join(', '),
      coverImage: post.coverImage || '',
      status: post.status,
      author: post.author,
      publishedAt: toDatetimeLocalValue(post.publishedAt),
    });
    setMessage('');
    setError('');
    setIsFormOpen(true);
  }

  function startNewPost() {
    setForm(emptyForm);
    setMessage('');
    setError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setMessage('');
    setError('');
    setIsFormOpen(false);
  }

  async function savePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');

    const payload = {
      title: form.title,
      slug: form.slug,
      summary: form.summary,
      content: form.content,
      category: form.category,
      tags: form.tags,
      coverImage: form.coverImage,
      status: form.status,
      author: form.author,
      publishedAt: form.publishedAt,
    };

    try {
      const post = form.id
        ? await updateAdminBlogPost(form.id, payload)
        : await createAdminBlogPost(payload);
      setPosts((current) => (form.id ? current.map((item) => (item.id === post.id ? post : item)) : [post, ...current]));
      setForm(emptyForm);
      setMessage('Post salvo com sucesso.');
      setIsFormOpen(false);
    } catch (err) {
      handleError(err, 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadCoverImage(file: File) {
    setIsUploading(true);
    setMessage('');
    setError('');
    try {
      const url = await uploadAdminBlogCover(file);
      updateField('coverImage', url);
      setMessage('Imagem de capa enviada com sucesso.');
    } catch (err) {
      handleError(err, 'Não foi possível enviar a imagem.');
    } finally {
      setIsUploading(false);
    }
  }

  async function removePost(post: BlogPost) {
    if (!window.confirm(`Excluir "${post.title}"?`)) return;
    setError('');
    try {
      await deleteAdminBlogPost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      if (form.id === post.id) closeForm();
    } catch (err) {
      handleError(err, 'Não foi possível excluir.');
    }
  }

  async function togglePublish(post: BlogPost) {
    const nextStatus: BlogPostStatus = post.status === 'published' ? 'draft' : 'published';
    setError('');
    try {
      const updated = await updateAdminBlogPost(post.id, { ...post, status: nextStatus });
      setPosts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      handleError(err, 'Não foi possível atualizar o status.');
    }
  }

  return (
    <div className="size-full overflow-y-auto bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onOpenMenu}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Admin Kiki</p>
              <h1 className="truncate text-xl font-bold text-slate-950 lg:text-2xl">Blog</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={blogUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:flex"
            >
              <ExternalLink className="size-4" />
              Ver blog
            </a>
            <button
              type="button"
              onClick={startNewPost}
              className="flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800"
            >
              <Plus className="size-4" />
              Novo post
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 lg:px-8">
        {message ? <p className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800">{message}</p> : null}
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p> : null}

        {!isFormOpen ? (
          <>
            <BlogMetricsOverview posts={posts} metrics={metrics} />

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Posts</h2>
                  <p className="text-sm text-slate-500">{visiblePosts.length} de {posts.length} artigos</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por título, slug ou tag"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as BlogPostStatus | 'all')}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="all">Todos os status</option>
                    <option value="published">Publicados</option>
                    <option value="draft">Rascunhos</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 p-5 text-sm text-slate-600">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando posts...
                </div>
              ) : visiblePosts.length === 0 ? (
                <p className="p-5 text-sm text-slate-600">Nenhum post encontrado.</p>
              ) : (
                <PostsTable
                  posts={visiblePosts}
                  onEdit={editPost}
                  onRemove={removePost}
                  onTogglePublish={togglePublish}
                />
              )}
            </section>
          </>
        ) : (
          <PostForm
            form={form}
            isSaving={isSaving}
            isUploading={isUploading}
            onClose={closeForm}
            onSubmit={savePost}
            onUpdate={updateField}
            onUpload={uploadCoverImage}
          />
        )}
      </main>
    </div>
  );
}

function BlogMetricsOverview({ posts, metrics }: { posts: BlogPost[]; metrics: BlogMetricSummary[] }) {
  const postById = new Map(posts.map((post) => [post.id, post]));
  const totals = metrics.reduce(
    (acc, item) => ({
      impressions: acc.impressions + item.impressions,
      clicks: acc.clicks + item.clicks,
      views: acc.views + item.views,
      ctaClicks: acc.ctaClicks + item.ctaClicks,
      totalReadSeconds: acc.totalReadSeconds + item.totalReadSeconds,
      readSamples: acc.readSamples + item.readSamples,
    }),
    { impressions: 0, clicks: 0, views: 0, ctaClicks: 0, totalReadSeconds: 0, readSamples: 0 },
  );
  const averageReadSeconds = totals.readSamples ? Math.round(totals.totalReadSeconds / totals.readSamples) : 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Métricas</h2>
          <p className="text-sm text-slate-500">Desempenho agregado do blog</p>
        </div>
        <BarChart3 className="size-5 text-violet-700" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Eye} label="Impressões" value={totals.impressions} />
        <MetricCard icon={MousePointerClick} label="Cliques" value={totals.clicks} />
        <MetricCard icon={FileText} label="Views" value={totals.views} />
        <MetricCard icon={Send} label="Internos" value={totals.ctaClicks} />
        <MetricCard icon={CalendarClock} label="Tempo médio" value={formatDuration(averageReadSeconds)} />
      </div>
      {metrics.length ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Post</th>
                <th className="px-3 py-2">Imp.</th>
                <th className="px-3 py-2">Cliques</th>
                <th className="px-3 py-2">Views</th>
                <th className="px-3 py-2">Internos</th>
                <th className="px-3 py-2">Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((item) => {
                const post = postById.get(item.postId);
                return (
                  <tr key={`${item.postId}-${item.slug}`} className="text-slate-700">
                    <td className="max-w-[360px] truncate px-3 py-3 font-semibold text-slate-900">{post?.title || item.slug || item.postId}</td>
                    <td className="px-3 py-3">{item.impressions}</td>
                    <td className="px-3 py-3">{item.clicks}</td>
                    <td className="px-3 py-3">{item.views}</td>
                    <td className="px-3 py-3">{item.ctaClicks}</td>
                    <td className="px-3 py-3">{formatDuration(item.averageReadSeconds)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Ainda não há métricas registradas.</p>
      )}
    </section>
  );
}

function PostsTable({
  posts,
  onEdit,
  onRemove,
  onTogglePublish,
}: {
  posts: BlogPost[];
  onEdit: (post: BlogPost) => void;
  onRemove: (post: BlogPost) => Promise<void>;
  onTogglePublish: (post: BlogPost) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Post</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Publicação</th>
            <th className="px-4 py-3">Autor</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {posts.map((post) => {
            const badge = getPostBadge(post);
            return (
              <tr key={post.id} className="align-top hover:bg-slate-50/70">
                <td className="max-w-[460px] px-4 py-4">
                  <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{post.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{post.summary}</p>
                      <p className="mt-2 truncate font-mono text-xs text-slate-400">/{post.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Tags className="size-4 text-slate-400" />
                    <span className="font-medium">{post.category}</span>
                  </div>
                  {post.tags.length ? <p className="mt-1 max-w-44 truncate text-xs text-slate-400">{post.tags.join(', ')}</p> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatDate(post.publishedAt)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-slate-700">{post.author}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(post)}
                      className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      aria-label={`Editar ${post.title}`}
                      title="Editar"
                    >
                      <Edit3 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onTogglePublish(post)}
                      className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      {post.status === 'published' ? 'Despublicar' : isPostPublishable(post.publishedAt) ? 'Publicar' : 'Agendar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRemove(post)}
                      className="flex size-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      aria-label={`Excluir ${post.title}`}
                      title="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
        <Icon className="size-4 text-slate-400" />
      </div>
      <p className="text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function PostForm({
  form,
  isSaving,
  isUploading,
  onClose,
  onSubmit,
  onUpdate,
  onUpload,
}: {
  form: FormState;
  isSaving: boolean;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{form.id ? 'Editar post' : 'Novo post'}</h2>
          <p className="text-sm text-slate-500">Campos principais, publicação e capa</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Fechar
          </button>
          <button form="blog-post-form" disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <form id="blog-post-form" onSubmit={onSubmit} className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 p-4 lg:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <AdminInput label="Título" value={form.title} onChange={(value) => onUpdate('title', value)} required />
            <AdminInput label="Slug" value={form.slug} onChange={(value) => onUpdate('slug', slugify(value))} required />
          </div>
          <AdminTextarea label="Resumo" value={form.summary} onChange={(value) => onUpdate('summary', value)} required rows={3} />
          <ContentEditor value={form.content} onChange={(value) => onUpdate('content', value)} />
        </div>

        <aside className="border-t border-slate-200 bg-slate-50 p-4 lg:p-5 xl:border-l xl:border-t-0">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Imagem de capa</span>
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
                <input
                  id="blog-cover-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUpload(file);
                  }}
                  className="sr-only"
                />
                <label htmlFor="blog-cover-upload" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {isUploading ? 'Enviando...' : 'Selecionar imagem'}
                </label>
                {form.coverImage ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src={form.coverImage} alt="" className="aspect-video w-full object-cover" />
                    <div className="flex items-center justify-between gap-3 p-3">
                      <span className="truncate text-xs text-slate-500">{form.coverImage}</span>
                      <button type="button" onClick={() => onUpdate('coverImage', '')} className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                        Remover
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <AdminInput label="Categoria" value={form.category} onChange={(value) => onUpdate('category', value)} required />
              <AdminInput label="Tags" value={form.tags} onChange={(value) => onUpdate('tags', value)} placeholder="ia, rotina" />
              <AdminInput label="Autor" value={form.author} onChange={(value) => onUpdate('author', value)} />
              <AdminInput label="Data e horário" type="datetime-local" value={form.publishedAt} onChange={(value) => onUpdate('publishedAt', value)} />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
              <select value={form.status} onChange={(event) => onUpdate('status', event.target.value as BlogPostStatus)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                <option value="draft">Rascunho</option>
                <option value="published">Publicado / agendado</option>
              </select>
            </label>
          </div>
        </aside>
      </form>
    </section>
  );
}

function AdminInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} required={required} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
    </label>
  );
}

function AdminTextarea({
  label,
  value,
  onChange,
  rows,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} required={required} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
    </label>
  );
}

function ContentEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    editor.innerHTML = value || '';
  }, [value]);

  function syncContent() {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
    saveSelection();
  }

  function saveSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }

  function runCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    syncContent();
  }

  function applyFontSize(size: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    document.execCommand('fontSize', false, '7');
    editor.querySelectorAll('font[size="7"]').forEach((element) => {
      element.removeAttribute('size');
      (element as HTMLElement).style.fontSize = `${size}px`;
    });
    syncContent();
  }

  function ensureDefaultParagraph() {
    const editor = editorRef.current;
    if (!editor || editor.innerHTML.trim()) return;
    document.execCommand('formatBlock', false, 'P');
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">Conteúdo</span>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 p-2">
          <ToolbarSelect label="Estilo" defaultValue="P" onChange={(selectedValue) => runCommand('formatBlock', selectedValue)} options={[{ value: 'P', label: 'Texto normal' }, { value: 'H1', label: 'Título 1' }, { value: 'H2', label: 'Título 2' }, { value: 'H3', label: 'Título 3' }, { value: 'H4', label: 'Título 4' }]} />
          <ToolbarSelect label="Fonte" defaultValue="" onChange={(selectedValue) => runCommand('fontName', selectedValue)} options={[{ value: '', label: 'Fonte' }, { value: 'Arial', label: 'Arial' }, { value: 'Inter', label: 'Inter' }, { value: 'Georgia', label: 'Georgia' }, { value: 'Times New Roman', label: 'Times' }, { value: 'Verdana', label: 'Verdana' }, { value: 'monospace', label: 'Mono' }]} />
          <FontSizeControl onApply={applyFontSize} />
          <ToolbarSelect label="Lista" defaultValue="" onChange={(selectedValue) => runCommand(selectedValue)} options={[{ value: '', label: 'Lista' }, { value: 'insertUnorderedList', label: '• Pontos' }, { value: 'insertOrderedList', label: '1. Numerada' }]} />
          <ToolbarButton label="B" onClick={() => runCommand('bold')} />
          <ToolbarButton label="I" onClick={() => runCommand('italic')} />
          <ToolbarButton label="☰" title="Alinhar à esquerda" onClick={() => runCommand('justifyLeft')} />
          <ToolbarButton label="≡" title="Centralizar" onClick={() => runCommand('justifyCenter')} />
          <ToolbarButton label="☷" title="Alinhar à direita" onClick={() => runCommand('justifyRight')} />
        </div>
        <div ref={editorRef} contentEditable suppressContentEditableWarning onFocus={ensureDefaultParagraph} onInput={syncContent} onBlur={syncContent} onKeyUp={saveSelection} onMouseUp={saveSelection} className="min-h-[48vh] w-full overflow-y-auto bg-white px-4 py-3 text-sm leading-7 outline-none lg:min-h-[520px]" />
      </div>
    </label>
  );
}

function ToolbarSelect({
  label,
  defaultValue,
  options,
  onChange,
}: {
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        setValue(defaultValue);
        if (nextValue) onChange(nextValue);
      }}
      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm outline-none hover:bg-violet-50 hover:text-violet-700"
    >
      {options.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FontSizeControl({ onApply }: { onApply: (value: string) => void }) {
  const [value, setValue] = useState('16');

  function applyValue() {
    const size = Number(value);
    if (!Number.isFinite(size) || size < 8 || size > 96) return;
    onApply(String(size));
  }

  return (
    <label className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm">
      <span className="sr-only">Tamanho da fonte</span>
      <input type="number" min={8} max={96} value={value} onChange={(event) => setValue(event.target.value)} onBlur={applyValue} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyValue(); } }} className="h-6 w-12 bg-transparent text-center outline-none" />
      <span>px</span>
    </label>
  );
}

function ToolbarButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button type="button" title={title} aria-label={title || label} onClick={onClick} className="h-8 rounded-md bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-violet-50 hover:text-violet-700">
      {label}
    </button>
  );
}

function toDatetimeLocalValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value.includes('T') ? value : `${value}T00:00:00`);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getPostBadge(post: BlogPost) {
  if (post.status === 'draft') {
    return { label: 'Rascunho', className: 'bg-gray-100 text-gray-600' };
  }
  if (!isPostPublishable(post.publishedAt)) {
    return { label: 'Agendado', className: 'bg-amber-50 text-amber-700' };
  }
  return { label: 'Publicado', className: 'bg-emerald-50 text-emerald-700' };
}
