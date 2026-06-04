/** Base URL do backend: `frontend/src/.env` → `VITE_API_BASE_URL` (Vite só expõe variáveis `VITE_*`). */
function resolveApiBaseUrl(): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    '';
  const trimmed = String(raw).trim().replace(/\/$/, '');
  return trimmed || 'http://127.0.0.1:8000';
}

export const API_BASE_URL = resolveApiBaseUrl();

const ACCESS_TOKEN_KEY = 'kiki.auth.access_token';
const REFRESH_TOKEN_KEY = 'kiki.auth.refresh_token';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  nickname: string;
  role: 'admin' | 'user' | string;
  is_active: boolean;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

/** Converte `detail` do FastAPI/Pydantic (string, lista ou objeto com `msg`) em texto para UI. */
export function parseFastApiDetail(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const detail = (body as { detail?: unknown }).detail;
  if (detail === undefined || detail === null) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'msg' in item) {
        const m = (item as { msg?: unknown }).msg;
        return typeof m === 'string' ? m : '';
      }
      return '';
    });
    const joined = parts.filter(Boolean).join(' ');
    return joined || fallback;
  }
  if (typeof detail === 'object' && detail !== null && 'msg' in detail) {
    const m = (detail as { msg?: unknown }).msg;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

function getStoredTokens(): AuthTokens | null {
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

function saveTokens(tokens: AuthTokens) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthStorage() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function fetchMe(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Sessão inválida');
  }
  return response.json();
}

async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    throw new Error('Falha ao renovar sessão');
  }
  const data: TokenResponse = await response.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function initializeAuthSession(): Promise<AuthUser | null> {
  const stored = getStoredTokens();
  if (!stored) return null;

  try {
    return await fetchMe(stored.accessToken);
  } catch {
    try {
      const refreshed = await refreshTokens(stored.refreshToken);
      saveTokens(refreshed);
      return await fetchMe(refreshed.accessToken);
    } catch {
      clearAuthStorage();
      return null;
    }
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { success: false, message: parseFastApiDetail(body, 'E-mail ou senha inválidos.') };
    }

    const tokens: TokenResponse = await response.json();
    const normalizedTokens = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
    saveTokens(normalizedTokens);

    const user = await fetchMe(normalizedTokens.accessToken);
    return { success: true, user };
  } catch {
    return { success: false, message: 'Não foi possível conectar ao servidor.' };
  }
}

export class AuthSessionExpiredError extends Error {
  constructor() {
    super('Sessão expirada. Faça login novamente.');
    this.name = 'AuthSessionExpiredError';
  }
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Requisição autenticada com renovação automática do access token em 401. */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const stored = getStoredTokens();
  if (!stored) {
    clearAuthStorage();
    throw new AuthSessionExpiredError();
  }

  const headers = new Headers(init.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${stored.accessToken}`);
  }
  if (init.body != null && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const request = (accessToken: string) => {
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(buildUrl(path), { ...init, headers });
  };

  let response = await request(stored.accessToken);
  if (response.status !== 401) return response;

  try {
    const refreshed = await refreshTokens(stored.refreshToken);
    saveTokens(refreshed);
    response = await request(refreshed.accessToken);
  } catch {
    clearAuthStorage();
    throw new AuthSessionExpiredError();
  }

  if (response.status === 401) {
    clearAuthStorage();
    throw new AuthSessionExpiredError();
  }

  return response;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  nickname?: string;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
      nickname: input.nickname?.trim() || undefined,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível criar a conta.'));
  }
  return response.json();
}

export interface UpdateProfileInput {
  name?: string;
  nickname?: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  const response = await authorizedFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.name,
      nickname: input.nickname,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível atualizar o perfil.'));
  }
  return response.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const response = await authorizedFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível alterar a senha.'));
  }
}

export async function logout(): Promise<void> {
  const stored = getStoredTokens();
  if (!stored) {
    clearAuthStorage();
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored.refreshToken }),
    });
  } finally {
    clearAuthStorage();
  }
}
