import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Eye, Image as ImageIcon, Loader2, Menu, Palette, X } from 'lucide-react';
import { BlogContent } from '@/app/blog/BlogContent';
import { resolveBlogImageUrl } from '@/app/blog/blog-media';
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

type ToolbarState = {
  block: string;
  font: string;
  fontSize: string;
  color: string;
  align: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
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

const BLOG_DRAFT_KEY = 'kiki.blogAdmin.editorDraft';
const emptyToolbarState: ToolbarState = {
  block: 'P',
  font: '',
  fontSize: '',
  color: '#6d28d9',
  align: 'left',
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
};

function publicBlogUrl() {
  if (typeof window === 'undefined') return '/blog';
  return `${window.location.origin}/blog`;
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState('');
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const blogUrl = publicBlogUrl();

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [posts],
  );

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

  useEffect(() => {
    if (!isFormOpen) return;
    if (!form.title && !form.summary && !form.content) return;

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(BLOG_DRAFT_KEY, JSON.stringify({ form, savedAt }));
      setDraftSavedAt(savedAt);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [form, isFormOpen]);

  useEffect(() => {
    if (!isFormOpen) return;
    const hasDraft = Boolean(form.title || form.summary || form.content);
    if (!hasDraft) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.content, form.summary, form.title, isFormOpen]);

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
    const rawDraft = window.localStorage.getItem(BLOG_DRAFT_KEY);
    if (rawDraft && window.confirm('Existe um rascunho salvo localmente. Deseja continuar dele?')) {
      try {
        const draft = JSON.parse(rawDraft) as { form?: FormState; savedAt?: string };
        setForm({ ...emptyForm, ...draft.form });
        setDraftSavedAt(draft.savedAt || '');
      } catch {
        setForm(emptyForm);
        setDraftSavedAt('');
      }
    } else {
      setForm(emptyForm);
      setDraftSavedAt('');
    }
    setMessage('');
    setError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if ((form.title || form.summary || form.content) && !window.confirm('Fechar o editor? O rascunho local sera mantido.')) {
      return;
    }
    setForm(emptyForm);
    setMessage('');
    setError('');
    setIsFormOpen(false);
    setIsPreviewOpen(false);
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
      setIsPreviewOpen(false);
      setDraftSavedAt('');
      window.localStorage.removeItem(BLOG_DRAFT_KEY);
    } catch (err) {
      handleError(err, 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadCoverImage(file: File) {
    setPendingCoverFile(file);
  }

  async function uploadCroppedCoverImage(file: File) {
    setIsUploading(true);
    setMessage('');
    setError('');
    try {
      const url = await uploadAdminBlogCover(file);
      updateField('coverImage', url);
      setPendingCoverFile(null);
      setMessage('Imagem de capa enviada com sucesso.');
    } catch (err) {
      handleError(err, 'Não foi possível enviar a imagem.');
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadInlineImage(file: File) {
    setMessage('');
    setError('');
    try {
      const url = await uploadAdminBlogCover(file);
      setMessage('Imagem inserida no conteudo.');
      return url;
    } catch (err) {
      handleError(err, 'NÃ£o foi possÃ­vel enviar a imagem.');
      return '';
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
    <div className="size-full bg-gray-50 overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button type="button" onClick={onOpenMenu} className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Admin Kiki</p>
            <h1 className="truncate text-lg font-bold text-gray-950">Blog</h1>
          </div>
          <a href={blogUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-800 ring-1 ring-gray-200">
            Ver blog
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {message ? <p className="mb-4 rounded-2xl bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700">{message}</p> : null}
        {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        {!isFormOpen ? (
          <>
          <BlogMetricsOverview posts={posts} metrics={metrics} />
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-950">Posts existentes</h2>
                <p className="text-sm text-gray-500">Crie, edite, agende e publique artigos.</p>
              </div>
              <button onClick={startNewPost} className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg">
                Novo post
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                <Loader2 className="size-4 animate-spin" />
                Carregando posts...
              </div>
            ) : sortedPosts.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">Nenhum post criado ainda.</p>
            ) : (
              <div className="space-y-3">
                {sortedPosts.map((post) => {
                  const badge = getPostBadge(post);
                  return (
                    <article key={post.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">{post.category}</span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                          </div>
                          <h3 className="font-bold text-gray-950">{post.title}</h3>
                          <p className="mt-1 text-sm text-gray-600">{post.summary}</p>
                          <p className="mt-2 text-xs text-gray-500">/{post.slug}</p>
                          <p className="mt-1 text-xs text-gray-500">Publicação: {formatDate(post.publishedAt)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editPost(post)} className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-200">
                            Editar
                          </button>
                          <button onClick={() => void togglePublish(post)} className="rounded-full bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100">
                            {post.status === 'published' ? 'Despublicar' : isPostPublishable(post.publishedAt) ? 'Publicar' : 'Agendar'}
                          </button>
                          <button onClick={() => void removePost(post)} className="rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                            Excluir
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          </>
        ) : (
          <PostForm
            form={form}
            draftSavedAt={draftSavedAt}
            isSaving={isSaving}
            isUploading={isUploading}
            onClose={closeForm}
            onPreview={() => setIsPreviewOpen(true)}
            onSubmit={savePost}
            onUpdate={updateField}
            onUpload={uploadCoverImage}
            onUploadImage={uploadInlineImage}
          />
        )}
      </main>
      {isPreviewOpen ? <BlogPreviewModal form={form} onClose={() => setIsPreviewOpen(false)} /> : null}
      {pendingCoverFile ? <CoverCropModal file={pendingCoverFile} onClose={() => setPendingCoverFile(null)} onConfirm={(file) => void uploadCroppedCoverImage(file)} /> : null}
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
    <section className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-950">Métricas do blog</h2>
        <p className="text-sm text-gray-500">Impressões, cliques, leituras e tempo médio nos artigos.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label="Impressões" value={totals.impressions} />
        <MetricCard label="Cliques" value={totals.clicks} />
        <MetricCard label="Visualizações" value={totals.views} />
        <MetricCard label="Cliques internos" value={totals.ctaClicks} />
        <MetricCard label="Tempo médio" value={formatDuration(averageReadSeconds)} />
      </div>
      {metrics.length ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
          <div className="grid grid-cols-[1.4fr_repeat(5,0.7fr)] gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase text-gray-500">
            <span>Post</span>
            <span>Imp.</span>
            <span>Cliques</span>
            <span>Views</span>
            <span>Internos</span>
            <span>Tempo</span>
          </div>
          {metrics.map((item) => {
            const post = postById.get(item.postId);
            return (
              <div key={`${item.postId}-${item.slug}`} className="grid grid-cols-[1.4fr_repeat(5,0.7fr)] gap-2 border-t border-gray-100 px-3 py-3 text-xs text-gray-700">
                <span className="truncate font-semibold text-gray-900">{post?.title || item.slug || item.postId}</span>
                <span>{item.impressions}</span>
                <span>{item.clicks}</span>
                <span>{item.views}</span>
                <span>{item.ctaClicks}</span>
                <span>{formatDuration(item.averageReadSeconds)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">Ainda não há métricas registradas.</p>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-[11px] font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-950">{value}</p>
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

function formatRelativeSaveTime(value: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 5) return 'agora mesmo';
  if (elapsedSeconds < 60) return `ha ${elapsedSeconds} segundos`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes === 1) return 'ha 1 minuto';
  if (elapsedMinutes < 60) return `ha ${elapsedMinutes} minutos`;
  return 'ha mais de 1 hora';
}

function PostForm({
  form,
  draftSavedAt,
  isSaving,
  isUploading,
  onClose,
  onPreview,
  onSubmit,
  onUpdate,
  onUpload,
  onUploadImage,
}: {
  form: FormState;
  draftSavedAt: string;
  isSaving: boolean;
  isUploading: boolean;
  onClose: () => void;
  onPreview: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
  onUpload: (file: File) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-950">{form.id ? 'Editar post' : 'Novo post'}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {draftSavedAt ? `Rascunho local salvo ${formatRelativeSaveTime(draftSavedAt)}` : 'O rascunho local sera salvo automaticamente.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onPreview} className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100">
            <Eye className="size-3.5" />
            Pre-visualizar
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
            Fechar
          </button>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <AdminInput label="Título" value={form.title} onChange={(value) => onUpdate('title', value)} required />
        <AdminInput label="Slug" value={form.slug} onChange={(value) => onUpdate('slug', slugify(value))} required />
        <AdminTextarea label="Resumo" value={form.summary} onChange={(value) => onUpdate('summary', value)} required rows={3} />
        <ContentEditor value={form.content} onChange={(value) => onUpdate('content', value)} onUploadImage={onUploadImage} />
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminInput label="Categoria" value={form.category} onChange={(value) => onUpdate('category', value)} required />
          <AdminInput label="Tags" value={form.tags} onChange={(value) => onUpdate('tags', value)} placeholder="ia, rotina" />
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Imagem de capa</span>
          <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-4">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onUpload(file);
                event.currentTarget.value = '';
              }}
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <p className="mt-2 text-xs text-gray-500">JPG, PNG, WebP ou GIF.</p>
            {isUploading ? <p className="mt-2 text-sm text-purple-700">Enviando imagem...</p> : null}
            {form.coverImage ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <img src={resolveBlogImageUrl(form.coverImage)} alt="" className="h-36 w-full object-cover" decoding="async" />
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="truncate text-xs text-gray-500">{form.coverImage}</span>
                  <button type="button" onClick={() => onUpdate('coverImage', '')} className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                    Remover
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminInput label="Autor" value={form.author} onChange={(value) => onUpdate('author', value)} />
          <AdminInput label="Data e horário de publicação" type="datetime-local" value={form.publishedAt} onChange={(value) => onUpdate('publishedAt', value)} />
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Status</span>
          <select value={form.status} onChange={(event) => onUpdate('status', event.target.value as BlogPostStatus)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100">
            <option value="draft">Rascunho</option>
            <option value="published">Publicado / agendado</option>
          </select>
        </label>
        <button disabled={isSaving} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white transition hover:shadow-lg disabled:opacity-60">
          {isSaving ? 'Salvando...' : 'Salvar post'}
        </button>
      </form>
    </section>
  );
}

function BlogPreviewModal({ form, onClose }: { form: FormState; onClose: () => void }) {
  const publishedAt = form.publishedAt ? formatDate(form.publishedAt) : formatDate(new Date().toISOString());

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Pre-visualizacao</p>
            <h2 className="text-lg font-bold text-gray-950">{form.title || 'Post sem titulo'}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200" aria-label="Fechar pre-visualizacao">
            <X className="size-5" />
          </button>
        </div>
        <article className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-purple-700">
            <span className="rounded-full bg-purple-50 px-3 py-1">{form.category || 'Categoria'}</span>
            <span className="text-gray-400">{publishedAt}</span>
            <span className="text-gray-400">Por {form.author || 'Time Kiki'}</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-950 md:text-5xl">{form.title || 'Titulo do artigo'}</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">{form.summary || 'Resumo do artigo.'}</p>
          {form.coverImage ? <img src={resolveBlogImageUrl(form.coverImage)} alt="" className="mt-8 max-h-[70vh] w-full rounded-3xl bg-gray-50 object-contain" decoding="async" /> : null}
          <div className="mt-8">
            <BlogContent content={form.content || '<p>Comece a escrever seu artigo...</p>'} />
          </div>
        </article>
      </div>
    </div>
  );
}

function CoverCropModal({
  file,
  onClose,
  onConfirm,
}: {
  file: File;
  onClose: () => void;
  onConfirm: (file: File) => void;
}) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function confirmCrop() {
    if (!imageUrl) return;
    setIsProcessing(true);
    try {
      const croppedFile = await cropCoverImage(file, imageUrl, imageSize, { positionX, positionY, zoom });
      onConfirm(croppedFile);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-gray-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Capa do blog</p>
            <h2 className="text-xl font-bold text-gray-950">Ajustar imagem para os cards</h2>
            <p className="mt-1 text-sm text-gray-500">A moldura cinza mostra exatamente o espaco usado na capa da lista de artigos.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200" aria-label="Fechar ajuste de capa">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="rounded-2xl bg-gray-100 p-4">
            <div className="relative mx-auto aspect-[16/10] max-h-[520px] overflow-hidden rounded-2xl border-2 border-gray-400/70 bg-gray-200 shadow-inner">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                  className="size-full object-cover"
                  style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})` }}
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-gray-950/10" />
              <div className="pointer-events-none absolute inset-3 rounded-xl border border-white/80 shadow-[0_0_0_999px_rgba(75,85,99,0.22)]" />
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-gray-950/55 px-3 py-1 text-xs font-semibold text-white">area visivel nos cards</div>
            </div>
          </div>

          <div className="space-y-4">
            <ControlSlider label="Zoom" value={zoom} min={1} max={2.4} step={0.05} onChange={setZoom} />
            <ControlSlider label="Horizontal" value={positionX} min={0} max={100} step={1} onChange={setPositionX} />
            <ControlSlider label="Vertical" value={positionY} min={0} max={100} step={1} onChange={setPositionY} />
            <div className="rounded-2xl bg-purple-50 p-4 text-xs leading-5 text-purple-900">
              Use o ajuste para escolher o que aparece na capa da lista. No artigo aberto, a imagem sera exibida sem corte.
            </div>
            <button type="button" disabled={isProcessing} onClick={() => void confirmCrop()} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg disabled:opacity-60">
              {isProcessing ? 'Preparando imagem...' : 'Usar esta capa'}
            </button>
            <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-2xl border border-gray-200 bg-white p-4">
      <span className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-800">
        {label}
        <span className="text-xs text-gray-500">{label === 'Zoom' ? `${value.toFixed(2)}x` : `${Math.round(value)}%`}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-purple-600" />
    </label>
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
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} required={required} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
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
    <div className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} required={required} className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
    </div>
  );
}

function ContentEditor({
  value,
  onChange,
  onUploadImage,
}: {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<void | string>;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(emptyToolbarState);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    editor.innerHTML = value || '';
    setIsEditorEmpty(isHtmlEmpty(value));
    updateToolbarState();
  }, [value]);

  useEffect(() => {
    const updateFromSelection = () => updateToolbarState();
    document.addEventListener('selectionchange', updateFromSelection);
    return () => document.removeEventListener('selectionchange', updateFromSelection);
  }, []);

  function syncContent() {
    const editor = editorRef.current;
    if (!editor) return;
    setIsEditorEmpty(isHtmlEmpty(editor.innerHTML));
    onChange(editor.innerHTML);
    saveSelection();
    updateToolbarState();
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

  function updateToolbarState() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const inspectedElements = getSelectionElements(editor, range);
    if (!inspectedElements.length) return;

    const blockValues = inspectedElements.map((element) => getBlockValue(element, editor));
    const fontValues = inspectedElements.map((element) => normalizeFontFamily(getComputedStyle(element).fontFamily));
    const sizeValues = inspectedElements.map((element) => `${Math.round(Number.parseFloat(getComputedStyle(element).fontSize))}`);
    const colorValues = inspectedElements.map((element) => normalizeColor(getComputedStyle(element).color));
    const alignValues = inspectedElements.map((element) => getAlignmentValue(element, editor));

    setToolbarState({
      block: getUniformValue(blockValues) || '',
      font: getUniformValue(fontValues) || '',
      fontSize: getUniformValue(sizeValues) || '',
      color: getUniformValue(colorValues) || '',
      align: getUniformValue(alignValues) || '',
      bold: inspectedElements.every(isBoldElement),
      italic: inspectedElements.every(isItalicElement),
      underline: inspectedElements.every(isUnderlinedElement),
      unorderedList: inspectedElements.every((element) => Boolean(element.closest('ul'))),
      orderedList: inspectedElements.every((element) => Boolean(element.closest('ol'))),
    });
  }

  function runCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    syncContent();
    window.setTimeout(updateToolbarState, 0);
  }

  function insertLink() {
    const href = window.prompt('Cole o link');
    if (!href) return;
    const url = href.startsWith('http://') || href.startsWith('https://') ? href : `https://${href}`;
    runCommand('createLink', url);
    editorRef.current?.querySelectorAll('a').forEach((anchor) => {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    });
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

  function applyTextColor(color: string) {
    runCommand('foreColor', color);
  }

  async function insertInlineImage(file: File) {
    setIsUploadingInlineImage(true);
    try {
      const result = await onUploadImage(file);
      const url = typeof result === 'string' ? result : '';
      if (!url) return;
      const caption = window.prompt('Legenda da imagem (opcional)')?.trim() || '';
      const figure = document.createElement('figure');
      figure.setAttribute('data-kiki-image', 'true');
      figure.setAttribute('style', imageFigureStyle('center'));

      const image = document.createElement('img');
      image.src = url;
      image.alt = caption;
      image.setAttribute('style', 'display:block;width:100%;max-width:720px;border-radius:18px;margin:0 auto;');
      figure.appendChild(image);

      if (caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = caption;
        figcaption.setAttribute('style', 'margin-top:10px;text-align:center;color:#6b7280;font-size:14px;');
        figure.appendChild(figcaption);
      }

      insertNodeAtSelection(figure);
      syncContent();
      setSelectedImage(image);
    } finally {
      setIsUploadingInlineImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function insertNodeAtSelection(node: Node) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      editor.appendChild(node);
    }
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<br>';
    node.parentNode?.insertBefore(paragraph, node.nextSibling);
  }

  function applySelectedImageWidth(width: string) {
    if (!selectedImage) return;
    selectedImage.style.width = width;
    selectedImage.style.maxWidth = '100%';
    syncContent();
  }

  function applySelectedImageAlign(align: 'left' | 'center' | 'right' | 'inline-left') {
    const figure = selectedImage?.closest('figure');
    if (!figure) return;
    figure.setAttribute('style', imageFigureStyle(align));
    syncContent();
  }

  function updateSelectedImageCaption() {
    const figure = selectedImage?.closest('figure');
    if (!figure || !selectedImage) return;
    const current = figure.querySelector('figcaption')?.textContent || '';
    const caption = window.prompt('Legenda da imagem', current)?.trim();
    if (caption === undefined) return;
    let figcaption = figure.querySelector('figcaption');
    if (!caption) {
      figcaption?.remove();
    } else {
      if (!figcaption) {
        figcaption = document.createElement('figcaption');
        figcaption.setAttribute('style', 'margin-top:10px;text-align:center;color:#6b7280;font-size:14px;');
        figure.appendChild(figcaption);
      }
      figcaption.textContent = caption;
      selectedImage.alt = caption;
    }
    syncContent();
  }

  function removeSelectedImage() {
    const figure = selectedImage?.closest('figure');
    if (!figure) return;
    figure.remove();
    setSelectedImage(null);
    syncContent();
  }

  function ensureDefaultParagraph() {
    const editor = editorRef.current;
    if (!editor || editor.innerHTML.trim()) return;
    editor.innerHTML = '<p><br></p>';
    const range = document.createRange();
    range.selectNodeContents(editor.firstChild || editor);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    saveSelection();
  }

  function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    setSelectedImage(target.tagName === 'IMG' ? (target as HTMLImageElement) : null);
    saveSelection();
    updateToolbarState();
  }

  return (
    <div className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">Conteúdo</span>
      <div className="overflow-hidden rounded-2xl border border-gray-300 bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-2">
          <ToolbarSelect label="Estilo" defaultValue="P" value={toolbarState.block} onChange={(selectedValue) => runCommand('formatBlock', selectedValue)} options={[{ value: '', label: '-' }, { value: 'P', label: 'Texto normal' }, { value: 'H1', label: 'Título 1' }, { value: 'H2', label: 'Título 2' }, { value: 'H3', label: 'Título 3' }, { value: 'H4', label: 'Subtítulo' }]} />
          <ToolbarSelect label="Fonte" defaultValue="" value={toolbarState.font} onChange={(selectedValue) => runCommand('fontName', selectedValue)} options={[{ value: '', label: '-' }, { value: 'Arial', label: 'Arial' }, { value: 'Inter', label: 'Inter' }, { value: 'Georgia', label: 'Georgia' }, { value: 'Times New Roman', label: 'Times' }, { value: 'Verdana', label: 'Verdana' }, { value: 'monospace', label: 'Mono' }]} />
          <FontSizeControl value={toolbarState.fontSize} onApply={applyFontSize} />
          <ColorControl value={toolbarState.color} onApply={applyTextColor} />
          <ToolbarSelect label="Lista" defaultValue="" value={toolbarState.unorderedList ? 'insertUnorderedList' : toolbarState.orderedList ? 'insertOrderedList' : ''} onChange={(selectedValue) => runCommand(selectedValue)} options={[{ value: '', label: 'Lista' }, { value: 'insertUnorderedList', label: '• Pontos' }, { value: 'insertOrderedList', label: '1. Numerada' }]} />
          <ToolbarButton label="B" active={toolbarState.bold} onClick={() => runCommand('bold')} />
          <ToolbarButton label="I" active={toolbarState.italic} onClick={() => runCommand('italic')} />
          <ToolbarButton label="U" active={toolbarState.underline} title="Sublinhado" onClick={() => runCommand('underline')} />
          <ToolbarButton label="☰" active={toolbarState.align === 'left'} title="Alinhar à esquerda" onClick={() => runCommand('justifyLeft')} />
          <ToolbarButton label="≡" active={toolbarState.align === 'center'} title="Centralizar" onClick={() => runCommand('justifyCenter')} />
          <ToolbarButton label="☷" active={toolbarState.align === 'right'} title="Alinhar à direita" onClick={() => runCommand('justifyRight')} />
          <ToolbarButton label="J" active={toolbarState.align === 'justify'} title="Justificar" onClick={() => runCommand('justifyFull')} />
          <ToolbarButton label="Link" title="Inserir link" onClick={insertLink} />
          <ToolbarButton label="Limpar" title="Remover formatacao" onClick={() => runCommand('removeFormat')} />
          <ToolbarButton label="Undo" title="Desfazer" onClick={() => runCommand('undo')} />
          <ToolbarButton label="Redo" title="Refazer" onClick={() => runCommand('redo')} />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void insertInlineImage(file);
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingInlineImage}
            className="inline-flex h-8 items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-3 text-xs font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-60"
          >
            <ImageIcon className="size-4" />
            {isUploadingInlineImage ? 'Enviando...' : 'Imagem'}
          </button>
        </div>
        {selectedImage ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-purple-100 bg-purple-50/70 p-2">
            <span className="text-xs font-semibold text-purple-900">Imagem selecionada</span>
            <ToolbarSelect label="Largura da imagem" defaultValue="" onChange={applySelectedImageWidth} options={[{ value: '', label: 'Largura' }, { value: '35%', label: '35%' }, { value: '50%', label: '50%' }, { value: '75%', label: '75%' }, { value: '100%', label: '100%' }]} />
            <ToolbarSelect label="Posicao da imagem" defaultValue="" onChange={(selectedValue) => applySelectedImageAlign(selectedValue as 'left' | 'center' | 'right' | 'inline-left')} options={[{ value: '', label: 'Posicao' }, { value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' }, { value: 'inline-left', label: 'Ao lado do texto' }]} />
            <ToolbarButton label="Legenda" title="Editar legenda" onClick={updateSelectedImageCaption} />
            <ToolbarButton label="Remover" title="Remover imagem" onClick={removeSelectedImage} />
          </div>
        ) : null}
        <div className="relative" onMouseDown={() => editorRef.current?.focus()}>
          {isEditorEmpty ? <p className="pointer-events-none absolute left-5 top-5 text-base text-gray-400">Comece a escrever seu artigo...</p> : null}
          <div ref={editorRef} contentEditable suppressContentEditableWarning onClick={handleEditorClick} onFocus={() => { ensureDefaultParagraph(); updateToolbarState(); }} onInput={syncContent} onBlur={syncContent} onKeyUp={() => { saveSelection(); updateToolbarState(); }} onMouseUp={() => { saveSelection(); updateToolbarState(); }} className="min-h-[460px] w-full overflow-y-auto bg-white px-5 py-5 text-base leading-8 text-gray-800 outline-none md:text-lg [&_a]:font-semibold [&_a]:text-purple-700 [&_figcaption]:text-sm [&_figcaption]:text-gray-500 [&_figure]:clear-both [&_figure]:my-7 [&_img]:shadow-lg [&_img]:shadow-purple-900/10 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" />
        </div>
      </div>
    </div>
  );
}

function ToolbarSelect({
  label,
  defaultValue,
  value,
  options,
  onChange,
}: {
  label: string;
  defaultValue: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const currentValue = value ?? localValue;

  return (
    <select
      aria-label={label}
      value={currentValue}
      onChange={(event) => {
        const nextValue = event.target.value;
        setLocalValue(defaultValue);
        if (nextValue) onChange(nextValue);
      }}
      className={`h-8 rounded-full border px-3 text-xs font-semibold shadow-sm outline-none hover:bg-purple-50 hover:text-purple-700 ${currentValue === '' ? 'border-purple-200 bg-purple-50 text-purple-500' : 'border-gray-200 bg-white text-gray-700'}`}
    >
      {options.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FontSizeControl({ value, onApply }: { value: string; onApply: (value: string) => void }) {
  const [draftValue, setDraftValue] = useState(value || '');

  useEffect(() => {
    setDraftValue(value || '');
  }, [value]);

  function applyValue() {
    const size = Number(draftValue);
    if (!Number.isFinite(size) || size < 8 || size > 96) return;
    onApply(String(size));
  }

  return (
    <label className="flex h-8 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 shadow-sm">
      <span className="sr-only">Tamanho da fonte</span>
      <input type="text" inputMode="numeric" placeholder="-" value={draftValue} onChange={(event) => setDraftValue(event.target.value.replace(/\D/g, ''))} onBlur={applyValue} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyValue(); } }} className="h-6 w-12 bg-transparent text-center outline-none placeholder:text-purple-400" />
      <span>px</span>
    </label>
  );
}

function ColorControl({ value, onApply }: { value: string; onApply: (value: string) => void }) {
  const currentValue = value || '#6d28d9';

  return (
    <label title={value ? 'Cor do texto' : 'Cor do texto mista'} className={`flex h-8 items-center gap-2 rounded-full border px-2 text-xs font-semibold shadow-sm hover:bg-purple-50 ${value ? 'border-gray-200 bg-white text-gray-700' : 'border-purple-200 bg-purple-50 text-purple-600'}`}>
      <Palette className="size-3.5 text-purple-700" />
      {!value ? <span className="text-xs">-</span> : null}
      <input
        type="color"
        value={currentValue}
        onChange={(event) => {
          onApply(event.target.value);
        }}
        className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
        aria-label="Cor do texto"
      />
    </label>
  );
}

function ToolbarButton({ label, onClick, title, active }: { label: string; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button type="button" title={title} aria-label={title || label} aria-pressed={active} onClick={onClick} className={`h-8 rounded-full px-3 text-xs font-semibold shadow-sm ring-1 transition hover:bg-purple-50 hover:text-purple-700 ${active ? 'bg-purple-100 text-purple-800 ring-purple-200' : 'bg-white text-gray-700 ring-gray-200'}`}>
      {label}
    </button>
  );
}

function isHtmlEmpty(value: string) {
  if (!value) return true;
  const container = document.createElement('div');
  container.innerHTML = value;
  return !container.textContent?.trim() && !container.querySelector('img, video, iframe');
}

function getSelectionElements(editor: HTMLElement, range: Range) {
  if (range.collapsed) {
    const node = range.startContainer;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return element && editor.contains(element) ? [element as HTMLElement] : [];
  }

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(node);
      return range.intersectsNode(node) && !rangeCollapsedOutside(range, nodeRange) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const elements: HTMLElement[] = [];
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && editor.contains(parent)) elements.push(parent);
    node = walker.nextNode();
  }
  const ancestor = range.commonAncestorContainer;
  const fallback = ancestor.nodeType === Node.ELEMENT_NODE ? (ancestor as Element) : ancestor.parentElement;
  return elements.length ? elements : [fallback instanceof HTMLElement ? fallback : editor];
}

function rangeCollapsedOutside(selectionRange: Range, nodeRange: Range) {
  return selectionRange.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 || selectionRange.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0;
}

function getUniformValue(values: string[]) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  if (!normalized.length) return '';
  return normalized.every((value) => value === normalized[0]) ? normalized[0] : '';
}

function getBlockValue(element: Element, editor: HTMLElement) {
  const block = element.closest('h1,h2,h3,h4,p,div,li');
  if (!block || block === editor) return 'P';
  const tag = block.tagName.toUpperCase();
  if (tag === 'LI') return 'P';
  return ['H1', 'H2', 'H3', 'H4'].includes(tag) ? tag : 'P';
}

function getAlignmentValue(element: Element, editor: HTMLElement) {
  const block = element.closest('h1,h2,h3,h4,p,div,li') as HTMLElement | null;
  const align = getComputedStyle(block && block !== editor ? block : element).textAlign;
  if (align === 'start') return 'left';
  if (align === 'end') return 'right';
  if (align === 'justify') return 'justify';
  if (align === 'center' || align === 'right') return align;
  return 'left';
}

function isBoldElement(element: Element) {
  const weight = getComputedStyle(element).fontWeight;
  return Boolean(element.closest('strong,b')) || weight === 'bold' || Number(weight) >= 600;
}

function isItalicElement(element: Element) {
  return Boolean(element.closest('em,i')) || getComputedStyle(element).fontStyle === 'italic';
}

function isUnderlinedElement(element: Element) {
  return Boolean(element.closest('u')) || getComputedStyle(element).textDecorationLine.includes('underline');
}

function normalizeColor(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return value;
  return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
}

function normalizeFontFamily(value: string) {
  const firstFont = value.split(',')[0].replaceAll('"', '').replaceAll("'", '').trim();
  const knownFonts = ['Arial', 'Inter', 'Georgia', 'Times New Roman', 'Verdana', 'monospace'];
  return knownFonts.find((font) => firstFont.toLowerCase().includes(font.toLowerCase())) || firstFont;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function cropCoverImage(
  originalFile: File,
  imageUrl: string,
  imageSize: { width: number; height: number },
  crop: { positionX: number; positionY: number; zoom: number },
) {
  const image = await loadImage(imageUrl);
  const naturalWidth = imageSize.width || image.naturalWidth;
  const naturalHeight = imageSize.height || image.naturalHeight;
  const outputWidth = 1600;
  const outputHeight = 1000;
  const outputRatio = outputWidth / outputHeight;

  let sourceWidth = naturalWidth;
  let sourceHeight = sourceWidth / outputRatio;
  if (sourceHeight > naturalHeight) {
    sourceHeight = naturalHeight;
    sourceWidth = sourceHeight * outputRatio;
  }

  sourceWidth = Math.max(1, sourceWidth / crop.zoom);
  sourceHeight = Math.max(1, sourceHeight / crop.zoom);

  const maxX = Math.max(0, naturalWidth - sourceWidth);
  const maxY = Math.max(0, naturalHeight - sourceHeight);
  const sourceX = maxX * (crop.positionX / 100);
  const sourceY = maxY * (crop.positionY / 100);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Nao foi possivel preparar a imagem.');

  context.fillStyle = '#f3f4f6';
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Nao foi possivel cortar a imagem.'))), 'image/jpeg', 0.86);
  });
  const fileName = `${originalFile.name.replace(/\.[^.]+$/, '') || 'capa-blog'}-capa.jpg`;
  return new File([blob], fileName, { type: 'image/jpeg' });
}

function imageFigureStyle(align: 'left' | 'center' | 'right' | 'inline-left') {
  const base = 'max-width:720px;text-align:center;';
  if (align === 'left') return `${base}margin:28px auto 28px 0;clear:both;`;
  if (align === 'right') return `${base}margin:28px 0 28px auto;clear:both;`;
  if (align === 'inline-left') return 'float:left;width:44%;max-width:360px;margin:8px 24px 16px 0;text-align:left;';
  return `${base}margin:28px auto;clear:both;`;
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
