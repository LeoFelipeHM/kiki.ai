import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export interface VoiceSessionResponse {
  url: string;
  token: string;
  room_name: string;
}

/** Credenciais LiveKit + dispatch do agente (requer login). */
export async function fetchVoiceSession(): Promise<VoiceSessionResponse> {
  let res: Response;
  try {
    res = await authorizedFetch('/voice/session', {
      method: 'POST',
      body: '{}',
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível iniciar a chamada de voz.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível iniciar a chamada de voz.'));
  }

  const data = (await res.json()) as VoiceSessionResponse;
  if (!data.url || !data.token || !data.room_name) {
    throw new Error('Resposta inválida do servidor.');
  }
  return data;
}
