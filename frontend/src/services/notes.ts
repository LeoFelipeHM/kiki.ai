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
  permissionRole: 'owner' | 'editor' | 'viewer' | string;
  isShared: boolean;
}

interface NoteApiRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  tags: string[];
  permission_role?: string;
  is_shared?: boolean;
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
    permissionRole: row.permission_role ?? 'owner',
    isShared: row.is_shared ?? false,
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
    throw new Error('Não foi possível carregar as notas.', { cause: e });
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
  expectedUpdatedAt?: Date;
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
    throw new Error('Não foi possível criar a nota.', { cause: e });
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
  if (payload.expectedUpdatedAt !== undefined) body.expected_updated_at = payload.expectedUpdatedAt.toISOString();

  let res: Response;
  try {
    res = await authorizedFetch(`/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível atualizar a nota.', { cause: e });
  }
  if (!res.ok) throw new Error(await parseNotesError(res));
  const row: NoteApiRow = await res.json();
  return mapApiNote(row);
}

export interface NoteCollaborator {
  id: string;
  noteId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer' | string;
  acceptedAt: Date | null;
  name: string;
  email: string;
  nickname: string;
}

interface NoteCollaboratorApi {
  id: string;
  note_id: string;
  user_id: string;
  role: string;
  accepted_at: string | null;
  name?: string | null;
  email?: string | null;
  nickname?: string | null;
}

function mapCollaborator(row: NoteCollaboratorApi): NoteCollaborator {
  return {
    id: row.id,
    noteId: row.note_id,
    userId: row.user_id,
    role: row.role,
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    name: row.name ?? '',
    email: row.email ?? '',
    nickname: row.nickname ?? '',
  };
}

export async function shareNote(
  noteId: string,
  userId: string,
  role: 'editor' | 'viewer' = 'editor',
): Promise<NoteCollaborator> {
  const res = await authorizedFetch(`/notes/${noteId}/share`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role }),
  });
  if (!res.ok) throw new Error(await parseNotesError(res));
  return mapCollaborator(await res.json());
}

export async function fetchNoteCollaborators(noteId: string): Promise<NoteCollaborator[]> {
  const res = await authorizedFetch(`/notes/${noteId}/collaborators`);
  if (!res.ok) throw new Error(await parseNotesError(res));
  const rows: NoteCollaboratorApi[] = await res.json();
  return rows.map(mapCollaborator);
}

export async function updateNoteCollaboratorRole(
  noteId: string,
  userId: string,
  role: 'editor' | 'viewer',
): Promise<NoteCollaborator> {
  const res = await authorizedFetch(`/notes/${noteId}/collaborators/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(await parseNotesError(res));
  return mapCollaborator(await res.json());
}

export async function removeNoteCollaborator(noteId: string, userId: string): Promise<void> {
  const res = await authorizedFetch(`/notes/${noteId}/collaborators/${userId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(await parseNotesError(res));
}

export async function deleteNote(noteId: string): Promise<void> {
  let res: Response;
  try {
    res = await authorizedFetch(`/notes/${noteId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível excluir a nota.', { cause: e });
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseNotesError(res));
  }
}
