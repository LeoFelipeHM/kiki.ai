import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export interface AppNotification {
  id: string;
  kind: string;
  status: string;
  title: string;
  body: string;
  actorName: string | null;
  actorEmail: string | null;
  actorNickname: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

interface AppNotificationApi {
  id: string;
  kind: string;
  status: string;
  title: string;
  body: string;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_nickname?: string | null;
  payload?: Record<string, unknown>;
  created_at: string;
}

function mapNotification(row: AppNotificationApi): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    body: row.body,
    actorName: row.actor_name ?? null,
    actorEmail: row.actor_email ?? null,
    actorNickname: row.actor_nickname ?? null,
    payload: row.payload ?? {},
    createdAt: new Date(row.created_at),
  };
}

async function parseNotificationsError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Não foi possível processar notificações.');
}

export async function fetchAppNotifications(includeRead = true): Promise<AppNotification[]> {
  let res: Response;
  try {
    res = await authorizedFetch(`/notifications?include_read=${includeRead ? 'true' : 'false'}`);
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível carregar notificações.', { cause: e });
  }
  if (!res.ok) throw new Error(await parseNotificationsError(res));
  const rows: AppNotificationApi[] = await res.json();
  return rows.map(mapNotification);
}

export async function markAppNotificationRead(notificationId: string): Promise<AppNotification> {
  const res = await authorizedFetch(`/notifications/${notificationId}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await parseNotificationsError(res));
  return mapNotification(await res.json());
}

export async function actOnAppNotification(
  notificationId: string,
  action: 'accept' | 'decline',
): Promise<AppNotification> {
  const res = await authorizedFetch(`/notifications/${notificationId}/action`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(await parseNotificationsError(res));
  return mapNotification(await res.json());
}
