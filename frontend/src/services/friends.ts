import { AuthSessionExpiredError, authorizedFetch, parseFastApiDetail } from '@/services/auth';

export interface FriendUser {
  id: string;
  name: string;
  email: string;
  nickname: string;
  friendshipId: string | null;
  friendshipStatus: string | null;
}

export interface Friend {
  id: string;
  friendUserId: string;
  name: string;
  email: string;
  nickname: string;
  canViewCalendar: boolean;
  canRequestCalendarEvents: boolean;
  canCreateCalendarEventsDirect: boolean;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterNickname?: string | null;
  addresseeName?: string | null;
  addresseeEmail?: string | null;
  addresseeNickname?: string | null;
  createdAt: Date;
}

interface FriendUserApi {
  id: string;
  name: string;
  email: string;
  nickname: string;
  friendship_id?: string | null;
  friendship_status?: string | null;
}

interface FriendApi {
  id: string;
  friend_user_id: string;
  friend_name: string;
  friend_email: string;
  friend_nickname: string;
  can_view_calendar: boolean;
  can_request_calendar_events: boolean;
  can_create_calendar_events_direct: boolean;
}

interface FriendRequestApi {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_nickname?: string | null;
  addressee_name?: string | null;
  addressee_email?: string | null;
  addressee_nickname?: string | null;
  created_at: string;
}

function mapFriendUser(row: FriendUserApi): FriendUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    nickname: row.nickname,
    friendshipId: row.friendship_id ?? null,
    friendshipStatus: row.friendship_status ?? null,
  };
}

function mapFriend(row: FriendApi): Friend {
  return {
    id: row.id,
    friendUserId: row.friend_user_id,
    name: row.friend_name,
    email: row.friend_email,
    nickname: row.friend_nickname,
    canViewCalendar: row.can_view_calendar,
    canRequestCalendarEvents: row.can_request_calendar_events,
    canCreateCalendarEventsDirect: row.can_create_calendar_events_direct,
  };
}

function mapFriendRequest(row: FriendRequestApi): FriendRequest {
  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterNickname: row.requester_nickname,
    addresseeName: row.addressee_name,
    addresseeEmail: row.addressee_email,
    addresseeNickname: row.addressee_nickname,
    createdAt: new Date(row.created_at),
  };
}

async function parseFriendsError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Não foi possível processar amigos.');
}

export async function searchFriendUsers(query: string): Promise<FriendUser[]> {
  const qs = new URLSearchParams({ q: query.trim() });
  let res: Response;
  try {
    res = await authorizedFetch(`/friends/search?${qs}`);
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível buscar usuários.', { cause: e });
  }
  if (!res.ok) throw new Error(await parseFriendsError(res));
  const rows: FriendUserApi[] = await res.json();
  return rows.map(mapFriendUser);
}

export async function fetchFriends(): Promise<Friend[]> {
  let res: Response;
  try {
    res = await authorizedFetch('/friends');
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível carregar amigos.', { cause: e });
  }
  if (!res.ok) throw new Error(await parseFriendsError(res));
  const rows: FriendApi[] = await res.json();
  return rows.map(mapFriend);
}

export async function fetchFriendRequests(): Promise<FriendRequest[]> {
  let res: Response;
  try {
    res = await authorizedFetch('/friends/requests');
  } catch (e) {
    if (e instanceof AuthSessionExpiredError) throw e;
    throw new Error('Não foi possível carregar pedidos.', { cause: e });
  }
  if (!res.ok) throw new Error(await parseFriendsError(res));
  const rows: FriendRequestApi[] = await res.json();
  return rows.map(mapFriendRequest);
}

export async function requestFriendship(userId: string): Promise<FriendRequest> {
  const res = await authorizedFetch('/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(await parseFriendsError(res));
  return mapFriendRequest(await res.json());
}

export async function respondFriendRequest(
  friendshipId: string,
  action: 'accept' | 'decline' | 'block',
): Promise<FriendRequest> {
  const res = await authorizedFetch(`/friends/requests/${friendshipId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(await parseFriendsError(res));
  return mapFriendRequest(await res.json());
}

export async function updateFriendPermissions(
  friendshipId: string,
  payload: {
    canViewCalendar?: boolean;
    canRequestCalendarEvents?: boolean;
    canCreateCalendarEventsDirect?: boolean;
  },
): Promise<void> {
  const body: Record<string, boolean> = {};
  if (payload.canViewCalendar !== undefined) body.can_view_calendar = payload.canViewCalendar;
  if (payload.canRequestCalendarEvents !== undefined) {
    body.can_request_calendar_events = payload.canRequestCalendarEvents;
  }
  if (payload.canCreateCalendarEventsDirect !== undefined) {
    body.can_create_calendar_events_direct = payload.canCreateCalendarEventsDirect;
  }
  const res = await authorizedFetch(`/friends/${friendshipId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseFriendsError(res));
}
