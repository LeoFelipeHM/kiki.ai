import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** POST JSON completo (sem stream); mantido para uso pontual. */
export async function sendChat(messages: ChatApiMessage[]): Promise<string> {
  let res: Response;
  try {
    res = await authorizedFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível enviar a mensagem.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível obter resposta da Kiki.'));
  }
  const data = (await res.json()) as { reply?: string };
  return typeof data.reply === 'string' ? data.reply : '';
}

export interface StreamChatHandlers {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

function extractSseDataLines(block: string): string[] {
  const payloads: string[] = [];
  for (const line of block.split('\n')) {
    const trimmed = line.trimEnd();
    if (trimmed.startsWith('data:')) {
      payloads.push(trimmed.slice(5).trimStart());
    }
  }
  return payloads;
}

/**
 * POST `/chat/stream` — corpo SSE.
 * Eventos: `data: {"delta":"..."}` ou `data: {"error":"..."}`, encerramento `data: [DONE]`.
 */
export async function streamChat(messages: ChatApiMessage[], handlers: StreamChatHandlers): Promise<void> {
  let res: Response;
  try {
    res = await authorizedFetch('/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      headers: { Accept: 'text/event-stream' },
    });
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) {
      handlers.onError('Sua sessão expirou. Faça login novamente.');
      return;
    }
    handlers.onError('Não foi possível enviar a mensagem.');
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    handlers.onError(parseFastApiDetail(body, 'Não foi possível obter resposta da Kiki.'));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    handlers.onError('Resposta sem fluxo de dados.');
    return;
  }

  const decoder = new TextDecoder();
  let carry = '';
  let outcome: 'pending' | 'done' | 'error' = 'pending';

  const handlePayload = (raw: string): boolean => {
    if (raw === '[DONE]') {
      outcome = 'done';
      handlers.onDone();
      return true;
    }
    try {
      const obj = JSON.parse(raw) as { delta?: string; error?: string };
      if (typeof obj.error === 'string' && obj.error.length > 0) {
        outcome = 'error';
        handlers.onError(obj.error);
        return true;
      }
      if (typeof obj.delta === 'string' && obj.delta.length > 0) {
        handlers.onDelta(obj.delta);
      }
    } catch {
      /* ignora linha inválida */
    }
    return false;
  };

  try {
    let stopped = false;
    while (!stopped) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });

      const blocks = carry.split('\n\n');
      carry = blocks.pop() ?? '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        for (const dataLine of extractSseDataLines(block)) {
          if (handlePayload(dataLine)) {
            stopped = true;
            break;
          }
        }
        if (stopped) break;
      }
    }

    if (!stopped && carry.trim()) {
      for (const dataLine of extractSseDataLines(carry)) {
        if (handlePayload(dataLine)) {
          stopped = true;
          break;
        }
      }
    }

    if (outcome === 'pending') {
      outcome = 'done';
      handlers.onDone();
    }
  } finally {
    reader.releaseLock();
  }
}
