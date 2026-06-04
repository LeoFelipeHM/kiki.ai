import { CalendarDays, ChevronDown, ChevronUp, Menu, Plus, Search, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppNotificationsBell } from './HomeNotificationsBell';
import { useTheme } from './ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  fetchFriendRequests,
  fetchFriends,
  requestFriendship,
  respondFriendRequest,
  searchFriendUsers,
  updateFriendPermissions,
  type Friend,
  type FriendRequest,
  type FriendUser,
} from '@/services/friends';

interface ContactsScreenProps {
  onOpenMenu?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToHome?: () => void;
  onSessionExpired?: () => void;
  userName?: string;
}

export function ContactsScreen({
  onOpenMenu,
  onNavigateToNotifications,
  onNavigateToHome,
  onSessionExpired,
  userName = 'Maria Silva',
}: ContactsScreenProps) {
  const { themeColor } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendResults, setFriendResults] = useState<FriendUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState('');
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const addFriendSearchRef = useRef<HTMLInputElement>(null);

  const pendingRequests = friendRequests.filter((r) => r.status === 'pending');

  const loadFriends = useCallback(async () => {
    setActionError(null);
    try {
      const [friendsList, requestsList] = await Promise.all([fetchFriends(), fetchFriendRequests()]);
      setFriends(friendsList);
      setFriendRequests(requestsList);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Erro ao carregar amigos.');
    }
  }, [onSessionExpired]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      await loadFriends();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFriends]);

  useEffect(() => {
    if (pendingRequests.length > 0) setPendingExpanded(true);
  }, [pendingRequests.length]);

  useEffect(() => {
    if (!addFriendOpen) return;
    const query = friendSearch.trim();
    if (query.replace(/^@/, '').length < 3) {
      setFriendResults([]);
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          setFriendResults(await searchFriendUsers(query));
        } catch (e) {
          if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
          else setActionError(e instanceof Error ? e.message : 'Erro ao buscar usuários.');
        }
      })();
    }, 300);
    return () => window.clearTimeout(id);
  }, [addFriendOpen, friendSearch, onSessionExpired]);

  const openAddFriend = () => {
    setActionError(null);
    setFriendSearch('');
    setFriendResults([]);
    setAddFriendOpen(true);
    window.setTimeout(() => addFriendSearchRef.current?.focus(), 100);
  };

  const handleRequestFriend = async (userId: string) => {
    setActionError(null);
    try {
      await requestFriendship(userId);
      setFriendResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, friendshipStatus: 'pending' } : u)),
      );
      await loadFriends();
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      else setActionError(e instanceof Error ? e.message : 'Não foi possível enviar pedido.');
    }
  };

  const handleFriendRequestAction = async (friendshipId: string, action: 'accept' | 'decline') => {
    setActionError(null);
    try {
      await respondFriendRequest(friendshipId, action);
      await loadFriends();
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      else setActionError(e instanceof Error ? e.message : 'Não foi possível responder ao pedido.');
    }
  };

  const toggleDirectCalendar = async (friend: Friend) => {
    setActionError(null);
    try {
      await updateFriendPermissions(friend.id, {
        canCreateCalendarEventsDirect: !friend.canCreateCalendarEventsDirect,
      });
      setFriends((prev) =>
        prev.map((f) =>
          f.id === friend.id
            ? { ...f, canCreateCalendarEventsDirect: !f.canCreateCalendarEventsDirect }
            : f,
        ),
      );
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      else setActionError(e instanceof Error ? e.message : 'Não foi possível atualizar permissões.');
    }
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <div className="px-5 pt-6 pb-3 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={onNavigateToHome}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors btn-apple"
            >
              Kiki
            </button>
            <AppNotificationsBell onNavigateToAll={onNavigateToNotifications} />
          </div>

          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-2xl font-bold">Amigos</h2>
            <button
              type="button"
              onClick={openAddFriend}
              aria-label="Adicionar amigo"
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${themeColor} text-white flex items-center justify-center btn-apple-gradient shadow-lg hover:shadow-xl transition-all shrink-0`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {actionError ? (
            <p className="text-sm text-red-500" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="py-4 px-5 space-y-5">
            {/* Pedidos pendentes — compacto */}
            <section className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setPendingExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors btn-apple"
              >
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${themeColor} flex items-center justify-center shrink-0`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="flex-1 min-w-0 text-xs font-medium truncate">Pedidos pendentes</p>
                {pendingRequests.length > 0 ? (
                  <span
                    className={`min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br ${themeColor} text-[10px] font-semibold text-white flex items-center justify-center`}
                  >
                    {pendingRequests.length}
                  </span>
                ) : null}
                {pendingExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>

              {pendingExpanded ? (
                <div className="px-3 pb-2.5 space-y-1.5 border-t border-border pt-2">
                  {isLoading ? (
                    <p className="text-xs text-muted-foreground py-1">Carregando…</p>
                  ) : pendingRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">Nenhum pedido no momento.</p>
                  ) : (
                    pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-lg border border-purple-200/50 bg-purple-50/30 dark:bg-purple-950/15 dark:border-purple-900/30 px-2.5 py-2"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${themeColor} text-white flex items-center justify-center text-[10px] font-semibold shrink-0`}
                          >
                            {initials(req.requesterName ?? 'Usuário')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs truncate">
                              {req.requesterName ?? 'Usuário'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              @{req.requesterNickname ?? 'usuario'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleFriendRequestAction(req.id, 'accept')}
                            className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white bg-gradient-to-br ${themeColor}`}
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleFriendRequestAction(req.id, 'decline')}
                            className="flex-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-muted hover:bg-muted/80"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </section>

            {/* Lista de amigos */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Meus amigos
              </h3>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando amigos…</p>
              ) : friends.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-60" />
                  <p className="text-sm">Toque em + para adicionar um amigo pelo nickname.</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3"
                  >
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${themeColor} text-white flex items-center justify-center text-sm font-semibold`}
                    >
                      {initials(friend.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{friend.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{friend.nickname} • {friend.email}
                      </p>
                      <button
                        type="button"
                        onClick={() => void toggleDirectCalendar(friend)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-xs"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        {friend.canCreateCalendarEventsDirect
                          ? 'Pode criar direto'
                          : 'Eventos por aprovação'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={addFriendOpen}
        onOpenChange={(open) => {
          setAddFriendOpen(open);
          if (!open) {
            setFriendSearch('');
            setFriendResults([]);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Adicionar amigo</DialogTitle>
          </DialogHeader>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={addFriendSearchRef}
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Nickname (mín. 3 caracteres)"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-3">
            {friendSearch.trim().replace(/^@/, '').length > 0 &&
            friendSearch.trim().replace(/^@/, '').length < 3 ? (
              <p className="text-xs text-muted-foreground px-1">Digite pelo menos 3 caracteres.</p>
            ) : null}
            {friendResults.length === 0 &&
            friendSearch.trim().replace(/^@/, '').length >= 3 ? (
              <p className="text-xs text-muted-foreground px-1 py-4 text-center">Nenhum usuário encontrado.</p>
            ) : null}
            {friendResults.map((user) => (
              <div
                key={user.id}
                className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${themeColor} text-white flex items-center justify-center text-xs font-semibold`}
                >
                  {initials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.nickname}</p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(user.friendshipStatus)}
                  onClick={() => void handleRequestFriend(user.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium btn-apple ${
                    user.friendshipStatus
                      ? 'bg-muted text-muted-foreground'
                      : `bg-gradient-to-br ${themeColor} text-white`
                  }`}
                >
                  {user.friendshipStatus === 'accepted'
                    ? 'Amigo'
                    : user.friendshipStatus === 'pending'
                      ? 'Pendente'
                      : 'Adicionar'}
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAddFriendOpen(false)}
            className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 btn-apple flex items-center justify-center gap-2 shrink-0"
          >
            <X className="w-4 h-4" />
            Fechar
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
