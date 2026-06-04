import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NotificationPreferencesEditor } from './NotificationPreferencesEditor';
import { useTheme } from './ThemeProvider';
import { useAppShell } from '@/context/AppShellContext';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  actOnAppNotification,
  fetchAppNotifications,
  type AppNotification,
} from '@/services/notifications';

interface NotificationsScreenProps {
  onNavigateBack?: () => void;
}

export function NotificationsScreen({ onNavigateBack }: NotificationsScreenProps) {
  const { themeColor } = useTheme();
  const { onSessionExpired } = useAppShell();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError(null);
    try {
      setNotifications(await fetchAppNotifications(true));
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível carregar notificações.');
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleAction = async (notificationId: string, action: 'accept' | 'decline') => {
    setError(null);
    try {
      await actOnAppNotification(notificationId, action);
      await loadNotifications();
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível responder.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="px-5 pt-6 pb-3 border-b border-border">
        <button
          type="button"
          onClick={onNavigateBack}
          className="mb-4 text-sm text-muted-foreground hover:text-foreground"
        >
          Voltar
        </button>
        <h2 className="text-2xl font-bold">Notificações</h2>
        <p className="text-sm text-muted-foreground mt-1">Pedidos de amigos, notas e agenda.</p>
      </div>

      <div className="p-5 space-y-3">
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {notifications.filter((n) => n.status === 'pending' || n.status === 'read').length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Nenhuma solicitação pendente.
          </div>
        ) : (
          notifications
            .filter((n) => n.status === 'pending' || n.status === 'read')
            .map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold">{notification.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{notification.body}</p>
                {notification.actorName ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    De {notification.actorName}
                    {notification.actorNickname ? ` (@${notification.actorNickname})` : ''}
                  </p>
                ) : null}
                {['friend_request', 'note_share', 'calendar_event_request'].includes(notification.kind) ? (
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => void handleAction(notification.id, 'accept')}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-white bg-gradient-to-br ${themeColor}`}
                    >
                      <Check className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAction(notification.id, 'decline')}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm bg-muted hover:bg-muted/80"
                    >
                      <X className="w-4 h-4" />
                      Recusar
                    </button>
                  </div>
                ) : null}
              </div>
            ))
        )}
      </div>

      <NotificationPreferencesEditor
        variant="page"
        themeColor={themeColor}
        onSessionExpired={onSessionExpired}
      />
    </div>
  );
}
