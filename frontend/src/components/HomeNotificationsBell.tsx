import { Bell, Check, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from './ThemeProvider';
import { useAppShell } from '@/context/AppShellContext';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  actOnAppNotification,
  fetchAppNotifications,
  type AppNotification,
} from '@/services/notifications';

const ACTIONABLE_KINDS = ['friend_request', 'note_share', 'calendar_event_request'] as const;

function isVisibleNotification(n: AppNotification): boolean {
  return n.status === 'pending' || n.status === 'read';
}

interface AppNotificationsBellProps {
  onNavigateToAll?: () => void;
}

export function AppNotificationsBell({ onNavigateToAll }: AppNotificationsBellProps) {
  const { themeColor } = useTheme();
  const { onSessionExpired } = useAppShell();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const visible = notifications.filter(isVisibleNotification);
  const pendingCount = notifications.filter((n) => n.status === 'pending').length;

  const load = useCallback(async () => {
    setError(null);
    try {
      setNotifications(await fetchAppNotifications(true));
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível carregar notificações.');
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleAction = async (notificationId: string, action: 'accept' | 'decline') => {
    setActingId(notificationId);
    setError(null);
    try {
      await actOnAppNotification(notificationId, action);
      await load();
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível responder.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={pendingCount > 0 ? `${pendingCount} notificações pendentes` : 'Notificações'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {pendingCount > 0 ? (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br ${themeColor} text-[10px] font-semibold text-white flex items-center justify-center shadow-sm`}
          >
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-3rem,22rem)] rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {onNavigateToAll ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigateToAll();
                }}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium btn-apple"
              >
                Ver todas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain p-2 space-y-2">
            {loading && visible.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4 text-center">Carregando…</p>
            ) : null}
            {error ? <p className="text-xs text-red-500 px-2 py-1">{error}</p> : null}
            {!loading && visible.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-6 text-center">
                Nenhuma notificação no momento.
              </p>
            ) : (
              visible.map((notification) => {
                const actionable = ACTIONABLE_KINDS.includes(
                  notification.kind as (typeof ACTIONABLE_KINDS)[number],
                );
                const isActing = actingId === notification.id;
                return (
                  <div
                    key={notification.id}
                    className={`rounded-xl border p-3 ${
                      notification.status === 'pending'
                        ? 'border-purple-200/80 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/50'
                        : 'border-border bg-background'
                    }`}
                  >
                    <p className="text-sm font-medium leading-snug">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.body}</p>
                    {notification.actorName ? (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {notification.actorName}
                        {notification.actorNickname ? ` · @${notification.actorNickname}` : ''}
                      </p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground/80 mt-1">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: ptBR })}
                    </p>
                    {actionable && notification.status === 'pending' ? (
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => void handleAction(notification.id, 'accept')}
                          className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-white bg-gradient-to-br ${themeColor} disabled:opacity-50`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprovar
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => void handleAction(notification.id, 'decline')}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/80 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Recusar
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use AppNotificationsBell */
export const HomeNotificationsBell = AppNotificationsBell;
