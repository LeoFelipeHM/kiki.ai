'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { BlogPost, BlogPostStatus } from '../../blog/blog-types';
import { formatDate, isPostPublishable, slugify } from '../../blog/blog-utils';

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

export function BlogAdminPanel({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [posts],
  );

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
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startNewPost() {
    setForm(emptyForm);
    setMessage('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setMessage('');
    setIsFormOpen(false);
  }

  async function savePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

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

    const response = await fetch(form.id ? `/api/admin/blog/posts/${form.id}` : '/api/admin/blog/posts', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { post?: BlogPost; error?: string };
    if (!response.ok || !data.post) {
      setMessage(data.error || 'Não foi possível salvar.');
      setIsSaving(false);
      return;
    }

    setPosts((current) => (form.id ? current.map((post) => (post.id === data.post?.id ? data.post : post)) : [data.post!, ...current]));
    setForm(emptyForm);
    setMessage('Post salvo com sucesso.');
    setIsFormOpen(false);
    setIsSaving(false);
  }

  async function uploadCoverImage(file: File) {
    setIsUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/admin/blog/upload', {
      method: 'POST',
      body: formData,
    });
    const data = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !data.url) {
      setMessage(data.error || 'Não foi possível enviar a imagem.');
      setIsUploading(false);
      return;
    }

    updateField('coverImage', data.url);
    setMessage('Imagem de capa enviada com sucesso.');
    setIsUploading(false);
  }

  async function removePost(post: BlogPost) {
    if (!window.confirm(`Excluir "${post.title}"?`)) return;
    const response = await fetch(`/api/admin/blog/posts/${post.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Não foi possível excluir.');
      return;
    }
    setPosts((current) => current.filter((item) => item.id !== post.id));
    if (form.id === post.id) closeForm();
  }

  async function togglePublish(post: BlogPost) {
    const nextStatus: BlogPostStatus = post.status === 'published' ? 'draft' : 'published';
    const response = await fetch(`/api/admin/blog/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...post, tags: post.tags, status: nextStatus }),
    });
    const data = (await response.json()) as { post?: BlogPost };
    if (data.post) setPosts((current) => current.map((item) => (item.id === post.id ? data.post! : item)));
  }

  async function logout() {
    await fetch('/api/admin/blog/session', { method: 'DELETE' });
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:py-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 mb-3">
              Kiki Admin
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Blog</h1>
            <p className="text-gray-600 mt-2">Crie, edite e publique artigos do site.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/blog" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 border border-gray-200 hover:bg-gray-100">
              Ver blog
            </Link>
            <button onClick={logout} className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
              Sair
            </button>
          </div>
        </header>

        <div className="grid gap-6">
          {!isFormOpen ? (
          <section className="rounded-3xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-bold text-gray-900">Posts existentes</h2>
              <button onClick={startNewPost} className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg">
                Novo post
              </button>
            </div>
            <div className="space-y-3">
              {sortedPosts.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">Nenhum post criado ainda.</p>
              ) : (
                sortedPosts.map((post) => {
                  const badge = getPostBadge(post);
                  return (
                  <article key={post.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                            {post.category}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900">{post.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{post.summary}</p>
                        <p className="text-xs text-gray-500 mt-2">/{post.slug}</p>
                        <p className="text-xs text-gray-500 mt-1">Publicação: {formatDate(post.publishedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button onClick={() => editPost(post)} className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-200">
                          Editar
                        </button>
                        <button onClick={() => togglePublish(post)} className="rounded-full bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100">
                          {post.status === 'published' ? 'Despublicar' : isPostPublishable(post.publishedAt) ? 'Publicar' : 'Agendar'}
                        </button>
                        <button onClick={() => removePost(post)} className="rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                  );
                })
              )}
            </div>
          </section>
          ) : null}

          {isFormOpen ? (
          <section className="rounded-3xl border border-gray-200 bg-white p-5 md:p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-bold text-gray-900">{form.id ? 'Editar post' : 'Novo post'}</h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={savePost} className="space-y-4">
              <AdminInput label="Título" value={form.title} onChange={(value) => updateField('title', value)} required />
              <AdminInput label="Slug" value={form.slug} onChange={(value) => updateField('slug', slugify(value))} required />
              <AdminTextarea label="Resumo" value={form.summary} onChange={(value) => updateField('summary', value)} required rows={3} />
              <ContentEditor value={form.content} onChange={(value) => updateField('content', value)} />
              <div className="grid sm:grid-cols-2 gap-3">
                <AdminInput label="Categoria" value={form.category} onChange={(value) => updateField('category', value)} required />
                <AdminInput label="Tags" value={form.tags} onChange={(value) => updateField('tags', value)} placeholder="ia, rotina" />
              </div>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Imagem de capa</span>
                <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-4">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadCoverImage(file);
                    }}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:shadow-lg"
                  />
                  <p className="mt-2 text-xs text-gray-500">JPG, PNG, WebP ou GIF até 5 MB.</p>
                  {isUploading ? <p className="mt-2 text-sm text-purple-700">Enviando imagem...</p> : null}
                  {form.coverImage ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                      <img src={form.coverImage} alt="" className="h-36 w-full object-cover" />
                      <div className="flex items-center justify-between gap-3 p-3">
                        <span className="truncate text-xs text-gray-500">{form.coverImage}</span>
                        <button
                          type="button"
                          onClick={() => updateField('coverImage', '')}
                          className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <AdminInput label="Autor" value={form.author} onChange={(value) => updateField('author', value)} />
                <AdminInput label="Data e horário de publicação" type="datetime-local" value={form.publishedAt} onChange={(value) => updateField('publishedAt', value)} />
              </div>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value as BlogPostStatus)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado / agendado</option>
                </select>
              </label>
              {message ? <p className="text-sm text-purple-700">{message}</p> : null}
              <button disabled={isSaving} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white transition hover:shadow-lg disabled:opacity-60">
                {isSaving ? 'Salvando...' : 'Salvar post'}
              </button>
            </form>
          </section>
          ) : null}
        </div>
      </div>
    </main>
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
      <span className="block text-sm font-medium text-gray-700 mb-2">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />
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
      <span className="block text-sm font-medium text-gray-700 mb-2">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />
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
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !savedRangeRef.current) return;
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
    const fontElements = editor.querySelectorAll('font[size="7"]');
    fontElements.forEach((element) => {
      element.removeAttribute('size');
      (element as HTMLElement).style.fontSize = `${size}px`;
    });
    syncContent();
  }

  function ensureDefaultParagraph() {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML.trim()) return;
    document.execCommand('formatBlock', false, 'P');
  }

  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-2">Conteúdo</span>
      <div className="overflow-hidden rounded-2xl border border-gray-300 bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-2">
          <ToolbarSelect
            label="Estilo"
            defaultValue="P"
            onChange={(selectedValue) => runCommand('formatBlock', selectedValue)}
            options={[
              { value: 'P', label: 'Texto normal' },
              { value: 'H1', label: 'Título 1' },
              { value: 'H2', label: 'Título 2' },
              { value: 'H3', label: 'Título 3' },
              { value: 'H4', label: 'Título 4' },
            ]}
          />
          <ToolbarSelect
            label="Fonte"
            defaultValue=""
            onChange={(selectedValue) => runCommand('fontName', selectedValue)}
            options={[
              { value: '', label: 'Fonte' },
              { value: 'Arial', label: 'Arial' },
              { value: 'Inter', label: 'Inter' },
              { value: 'Georgia', label: 'Georgia' },
              { value: 'Times New Roman', label: 'Times' },
              { value: 'Verdana', label: 'Verdana' },
              { value: 'monospace', label: 'Mono' },
            ]}
          />
          <FontSizeControl onApply={applyFontSize} />
          <ToolbarSelect
            label="Lista"
            defaultValue=""
            onChange={(selectedValue) => runCommand(selectedValue)}
            options={[
              { value: '', label: 'Lista' },
              { value: 'insertUnorderedList', label: '• Pontos' },
              { value: 'insertOrderedList', label: '1. Numerada' },
            ]}
          />
          <ToolbarButton label="B" onClick={() => runCommand('bold')} />
          <ToolbarButton label="I" onClick={() => runCommand('italic')} />
          <ToolbarButton label="☰" title="Alinhar à esquerda" onClick={() => runCommand('justifyLeft')} />
          <ToolbarButton label="≡" title="Centralizar" onClick={() => runCommand('justifyCenter')} />
          <ToolbarButton label="☷" title="Alinhar à direita" onClick={() => runCommand('justifyRight')} />
        </div>
        <div
          id="blog-content-editor"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={ensureDefaultParagraph}
          onInput={syncContent}
          onBlur={syncContent}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className="min-h-[380px] w-full overflow-y-auto bg-white px-4 py-3 leading-7 outline-none"
        />
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
      <input
        type="number"
        min={8}
        max={96}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={applyValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            applyValue();
          }
        }}
        className="h-6 w-12 bg-transparent text-center outline-none"
      />
      <span>px</span>
    </label>
  );
}

function ToolbarButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title || label}
      onClick={onClick}
      className="h-8 rounded-full bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-purple-50 hover:text-purple-700"
    >
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
    return {
      label: 'Rascunho',
      className: 'bg-gray-100 text-gray-600',
    };
  }

  if (!isPostPublishable(post.publishedAt)) {
    return {
      label: 'Agendado',
      className: 'bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'Publicado',
    className: 'bg-emerald-50 text-emerald-700',
  };
}
