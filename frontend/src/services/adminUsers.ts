import { authorizedFetch, parseFastApiDetail } from './auth';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface AdminCreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export interface AdminUpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Erro na requisição');
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await authorizedFetch('/admin/users');
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createAdminUser(input: AdminCreateUserInput): Promise<AdminUser> {
  const res = await authorizedFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateAdminUser(userId: string, input: AdminUpdateUserInput): Promise<AdminUser> {
  const res = await authorizedFetch(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await authorizedFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res));
}
