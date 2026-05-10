import { authorizedFetch, parseFastApiDetail } from './auth';

export interface VapidPublicKeyDto {
  public_key: string;
}

export interface PushSubscribeRequestDto {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_agent?: string | null;
}

export class PushNotConfiguredError extends Error {
  constructor() {
    super('Web Push não está configurado no servidor.');
    this.name = 'PushNotConfiguredError';
  }
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  if (res.status === 503) return new PushNotConfiguredError();
  const body = await res.json().catch(() => ({}));
  return new Error(parseFastApiDetail(body, fallback));
}

export async function fetchVapidPublicKey(): Promise<string> {
  const res = await authorizedFetch('/push/vapid-public-key');
  if (!res.ok) throw await parseError(res, 'Não foi possível obter a chave VAPID.');
  const data: VapidPublicKeyDto = await res.json();
  return data.public_key;
}

export async function registerPushSubscription(payload: PushSubscribeRequestDto): Promise<void> {
  const res = await authorizedFetch('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 201) {
    throw await parseError(res, 'Não foi possível registrar a inscrição.');
  }
}

export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  const res = await authorizedFetch('/push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok && res.status !== 204) {
    throw await parseError(res, 'Não foi possível remover a inscrição.');
  }
}

export interface PushTestResponse {
  delivered: number;
}

export async function sendPushTest(): Promise<PushTestResponse> {
  const res = await authorizedFetch('/push/test', { method: 'POST' });
  if (!res.ok) throw await parseError(res, 'Não foi possível enviar a notificação de teste.');
  return res.json() as Promise<PushTestResponse>;
}
