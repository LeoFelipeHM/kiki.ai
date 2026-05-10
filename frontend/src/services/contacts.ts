import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export interface Contact {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactApiRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export function mapApiContact(row: ContactApiRow): Contact {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function parseContactsError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Não foi possível processar os contatos.');
}

export async function fetchContacts(): Promise<Contact[]> {
  let res: Response;
  try {
    res = await authorizedFetch('/contacts');
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível carregar os contatos.', { cause: e });
  }
  if (!res.ok) {
    throw new Error(await parseContactsError(res));
  }
  const rows: ContactApiRow[] = await res.json();
  return rows.map(mapApiContact);
}

export async function createContact(name: string, email: string): Promise<Contact> {
  let res: Response;
  try {
    res = await authorizedFetch('/contacts', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível criar o contato.', { cause: e });
  }
  if (!res.ok) {
    throw new Error(await parseContactsError(res));
  }
  const row: ContactApiRow = await res.json();
  return mapApiContact(row);
}

export async function patchContact(
  contactId: string,
  payload: { name?: string; email?: string },
): Promise<Contact> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.email !== undefined) body.email = payload.email;

  let res: Response;
  try {
    res = await authorizedFetch(`/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível atualizar o contato.', { cause: e });
  }
  if (!res.ok) {
    throw new Error(await parseContactsError(res));
  }
  const row: ContactApiRow = await res.json();
  return mapApiContact(row);
}

export async function deleteContact(contactId: string): Promise<void> {
  let res: Response;
  try {
    res = await authorizedFetch(`/contacts/${contactId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível excluir o contato.', { cause: e });
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseContactsError(res));
  }
}
