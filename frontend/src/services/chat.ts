import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  summary?: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  latestMessagePreview?: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface ChatConversationDetail extends ChatConversation {
  messages: ChatHistoryMessage[];
}

type ChatConversationDto = {
  id: string;
  title: string;
  summary?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  latest_message_preview?: string | null;
};

type ChatHistoryMessageDto = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type ChatConversationDetailDto = ChatConversationDto & {
  messages?: ChatHistoryMessageDto[];
};

function toConversation(dto: ChatConversationDto): ChatConversation {
  return {
    id: dto.id,
    title: dto.title,
    summary: dto.summary ?? null,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    messageCount: dto.message_count ?? 0,
    latestMessagePreview: dto.latest_message_preview ?? null,
  };
}

function toHistoryMessage(dto: ChatHistoryMessageDto): ChatHistoryMessage {
  return {
    id: dto.id,
    role: dto.role,
    content: dto.content,
    createdAt: new Date(dto.created_at),
  };
}

export async function fetchChatConversations(): Promise<ChatConversation[]> {
  const res = await authorizedFetch('/chat/conversations');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível carregar o histórico.'));
  }
  const data = (await res.json()) as ChatConversationDto[];
  return data.map(toConversation);
}

export async function fetchChatConversation(id: string): Promise<ChatConversationDetail> {
  const res = await authorizedFetch(`/chat/conversations/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseFastApiDetail(body, 'Não foi possível abrir a conversa.'));
  }
  const data = (await res.json()) as ChatConversationDetailDto;
  return {
    ...toConversation(data),
    messages: (data.messages ?? []).map(toHistoryMessage),
  };
}

/** POST JSON completo (sem stream); mantido para uso pontual. */
export async function sendChat(messages: ChatApiMessage[], conversationId?: string | null): Promise<string> {
  let res: Response;
  try {
    res = await authorizedFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, conversation_id: conversationId ?? undefined }),
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
  onMeta?: (meta: { conversationId: string; title: string; summary?: string | null }) => void;
  /** `true` = fluxo terminou sem `data: [DONE]` (rede/proxy); texto pode estar incompleto. */
  onDone: (interrupted?: boolean) => void;
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
export async function streamChat(
  messages: ChatApiMessage[],
  handlers: StreamChatHandlers,
  options?: { conversationId?: string | null },
): Promise<void> {
  let res: Response;
  try {
    res = await authorizedFetch('/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ messages, conversation_id: options?.conversationId ?? undefined }),
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
      handlers.onDone(false);
      return true;
    }
    try {
      const obj = JSON.parse(raw) as {
        delta?: string;
        error?: string;
        meta?: { conversation_id?: string; title?: string; summary?: string | null };
      };
      if (typeof obj.error === 'string' && obj.error.length > 0) {
        outcome = 'error';
        handlers.onError(obj.error);
        return true;
      }
      if (obj.meta?.conversation_id) {
        handlers.onMeta?.({
          conversationId: obj.meta.conversation_id,
          title: obj.meta.title || 'Nova conversa',
          summary: obj.meta.summary ?? null,
        });
      }
      if (typeof obj.delta === 'string') {
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
      carry = carry.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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
      handlers.onDone(true);
    }
  } finally {
    reader.releaseLock();
  }
}
