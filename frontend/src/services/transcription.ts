import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export async function transcribeChatAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  const ext =
    blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('wav') ? 'wav' : 'webm';
  form.append('file', blob, `recording.${ext}`);

  let res: Response;
  try {
    res = await authorizedFetch('/chat/transcribe', {
      method: 'POST',
      body: form,
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível enviar o áudio.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível transcrever o áudio.'));
  }

  const data = (await res.json()) as { text?: string };
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text) {
    throw new Error('Transcrição vazia.');
  }
  return text;
}
