import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2, Menu } from 'lucide-react';
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
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-950">{form.id ? 'Editar post' : 'Novo post'}</h2>
        <button type="button" onClick={onClose} className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200">
          Fechar
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <AdminInput label="Título" value={form.title} onChange={(value) => onUpdate('title', value)} required />
        <AdminInput label="Slug" value={form.slug} onChange={(value) => onUpdate('slug', slugify(value))} required />
        <AdminTextarea label="Resumo" value={form.summary} onChange={(value) => onUpdate('summary', value)} required rows={3} />
        <ContentEditor value={form.content} onChange={(value) => onUpdate('content', value)} />
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
              }}
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <p className="mt-2 text-xs text-gray-500">JPG, PNG, WebP ou GIF.</p>
            {isUploading ? <p className="mt-2 text-sm text-purple-700">Enviando imagem...</p> : null}
            {form.coverImage ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <img src={form.coverImage} alt="" className="h-36 w-full object-cover" />
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
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} required={required} className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
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
      <span className="mb-2 block text-sm font-medium text-gray-700">Conteúdo</span>
      <div className="overflow-hidden rounded-2xl border border-gray-300 bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-2">
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
        <div ref={editorRef} contentEditable suppressContentEditableWarning onFocus={ensureDefaultParagraph} onInput={syncContent} onBlur={syncContent} onKeyUp={saveSelection} onMouseUp={saveSelection} className="min-h-[380px] w-full overflow-y-auto bg-white px-4 py-3 leading-7 outline-none" />
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
      className="h-8 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm outline-none hover:bg-purple-50 hover:text-purple-700"
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
    <label className="flex h-8 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 shadow-sm">
      <span className="sr-only">Tamanho da fonte</span>
      <input type="number" min={8} max={96} value={value} onChange={(event) => setValue(event.target.value)} onBlur={applyValue} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyValue(); } }} className="h-6 w-12 bg-transparent text-center outline-none" />
      <span>px</span>
    </label>
  );
}

function ToolbarButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button type="button" title={title} aria-label={title || label} onClick={onClick} className="h-8 rounded-full bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-purple-50 hover:text-purple-700">
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
