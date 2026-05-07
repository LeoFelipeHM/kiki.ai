import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  tags: string[];
  isLocked: boolean;
}

interface NoteApiRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function mapApiNote(row: NoteApiRow): Note {
  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    isPinned: row.is_pinned,
    tags: row.tags ?? [],
    isLocked: row.is_locked,
  };
}

async function parseNotesError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Não foi possível processar as notas.');
}

export async function fetchNotes(search?: string): Promise<Note[]> {
  const qs = search?.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
  let res: Response;
  try {
    res = await authorizedFetch(`/notes${qs}`);
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível carregar as notas.');
  }
  if (!res.ok) {
    throw new Error(await parseNotesError(res));
  }
  const rows: NoteApiRow[] = await res.json();
  return rows.map(mapApiNote);
}

export interface CreateNotePayload {
  title: string;
  content: string;
  isPinned?: boolean;
  isLocked?: boolean;
  tags?: string[];
}

export async function createNote(payload: CreateNotePayload): Promise<Note> {
  const body = {
    title: payload.title,
    content: payload.content,
    is_pinned: payload.isPinned ?? false,
    is_locked: payload.isLocked ?? false,
    tags: payload.tags ?? [],
  };
  let res: Response;
  try {
    res = await authorizedFetch('/notes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível criar a nota.');
  }
  if (!res.ok) throw new Error(await parseNotesError(res));
  const row: NoteApiRow = await res.json();
  return mapApiNote(row);
}

export interface PatchNotePayload {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  tags?: string[];
}

export async function patchNote(noteId: string, payload: PatchNotePayload): Promise<Note> {
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.content !== undefined) body.content = payload.content;
  if (payload.isPinned !== undefined) body.is_pinned = payload.isPinned;
  if (payload.isLocked !== undefined) body.is_locked = payload.isLocked;
  if (payload.tags !== undefined) body.tags = payload.tags;

  let res: Response;
  try {
    res = await authorizedFetch(`/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível atualizar a nota.');
  }
  if (!res.ok) throw new Error(await parseNotesError(res));
  const row: NoteApiRow = await res.json();
  return mapApiNote(row);
}

export async function deleteNote(noteId: string): Promise<void> {
  let res: Response;
  try {
    res = await authorizedFetch(`/notes/${noteId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível excluir a nota.');
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseNotesError(res));
  }
}
