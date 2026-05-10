import { ArrowLeft, Bell, BellOff, Mail, MessageSquare, Calendar, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { backNavButtonClassName } from '@/lib/backNavButton';
import {
  AuthSessionExpiredError,
  fetchSettings,
  patchNotifications,
  type NotificationPreferencesDto,
} from '@/services/settings';
import {
  getNotificationPermission,
  isNotificationApiSupported,
  requestNotificationPermission,
  showBrowserNotification,
} from '@/lib/browserNotifications';
import {
  isWebPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushSubscription';
import { sendPushTest, PushNotConfiguredError } from '@/services/push';
import { useAppShell } from '@/context/AppShellContext';

export type NotificationPreferencesEditorProps = {
  variant: 'page' | 'modal';
  themeColor: string;
  onSessionExpired: () => void;
  onNavigateBack?: () => void;
  onModalCancel?: () => void;
  /** Chamado após salvar com sucesso (ex.: fechar modal e atualizar resumo). */
  onModalSaved?: () => void;
};

type NotificationsState = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminders: boolean;
  meetings: boolean;
  tasks: boolean;
  kikiSuggestions: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
};

const REMINDER_PT_TO_API: Record<string, 'friendly' | 'professional' | 'motivational'> = {
  Amigável: 'friendly',
  Profissional: 'professional',
  Motivacional: 'motivational',
};

const REMINDER_API_TO_PT: Record<string, string> = {
  friendly: 'Amigável',
  professional: 'Profissional',
  motivational: 'Motivacional',
};

function dtoToState(dto: {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  reminders_enabled: boolean;
  meetings_enabled: boolean;
  tasks_enabled: boolean;
  kiki_suggestions_enabled: boolean;
  daily_summary_enabled: boolean;
  weekly_report_enabled: boolean;
  reminder_style: string;
}): { notifications: NotificationsState; reminderStyle: string } {
  return {
    notifications: {
      pushEnabled: dto.push_enabled,
      emailEnabled: dto.email_enabled,
      smsEnabled: dto.sms_enabled,
      soundEnabled: dto.sound_enabled,
      vibrationEnabled: dto.vibration_enabled,
      reminders: dto.reminders_enabled,
      meetings: dto.meetings_enabled,
      tasks: dto.tasks_enabled,
      kikiSuggestions: dto.kiki_suggestions_enabled,
      dailySummary: dto.daily_summary_enabled,
      weeklyReport: dto.weekly_report_enabled,
    },
    reminderStyle: REMINDER_API_TO_PT[dto.reminder_style] ?? 'Amigável',
  };
}

function stateToPayload(n: NotificationsState, reminderStyle: string) {
  const rs = REMINDER_PT_TO_API[reminderStyle];
  if (!rs) throw new Error('Estilo de lembrete inválido.');
  return {
    push_enabled: n.pushEnabled,
    email_enabled: n.emailEnabled,
    sms_enabled: n.smsEnabled,
    sound_enabled: n.soundEnabled,
    vibration_enabled: n.vibrationEnabled,
    reminders_enabled: n.reminders,
    meetings_enabled: n.meetings,
    tasks_enabled: n.tasks,
    kiki_suggestions_enabled: n.kikiSuggestions,
    daily_summary_enabled: n.dailySummary,
    weekly_report_enabled: n.weeklyReport,
    reminder_style: rs,
  };
}

export function NotificationPreferencesEditor({
  variant,
  themeColor,
  onSessionExpired,
  onNavigateBack,
  onModalCancel,
  onModalSaved,
}: NotificationPreferencesEditorProps) {
  const { setNotificationPrefs } = useAppShell();
  const [notifications, setNotifications] = useState<NotificationsState>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
    reminders: true,
    meetings: true,
    tasks: true,
    kikiSuggestions: true,
    dailySummary: true,
    weeklyReport: false,
  });
  const [reminderStyle, setReminderStyle] = useState('Amigável');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission(),
  );
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const refreshPermission = useCallback(() => {
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    refreshPermission();
    if (typeof document === 'undefined') return;
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshPermission();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshPermission]);

  const handleRequestPermission = useCallback(async () => {
    setPermissionMessage(null);
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      if (isWebPushSupported()) {
        try {
          await subscribeToPush();
          setPermissionMessage(
            'Permissão concedida e dispositivo registrado para notificações em background.',
          );
        } catch (e) {
          if (e instanceof PushNotConfiguredError) {
            setPermissionMessage(
              'Permissão concedida. Notificações em background indisponíveis (Web Push não configurado).',
            );
          } else {
            setPermissionMessage(
              'Permissão concedida, mas falhou ao registrar o dispositivo: ' +
                (e instanceof Error ? e.message : 'erro desconhecido'),
            );
          }
        }
      } else {
        setPermissionMessage(
          'Permissão concedida. Este navegador não suporta notificações em background.',
        );
      }
    } else if (result === 'denied') {
      setPermissionMessage(
        'Permissão negada no navegador. Habilite manualmente nas configurações do site.',
      );
    } else if (result === 'unsupported') {
      setPermissionMessage('Este navegador não suporta notificações.');
    } else {
      setPermissionMessage('A solicitação foi cancelada. Tente novamente.');
    }
  }, []);

  const handleSendTest = useCallback(async () => {
    setPermissionMessage(null);
    let perm = permission;
    if (perm === 'default') {
      perm = await requestNotificationPermission();
      setPermission(perm);
    }
    if (perm !== 'granted') {
      setPermissionMessage(
        perm === 'unsupported'
          ? 'Seu navegador não suporta notificações.'
          : 'Conceda permissão no navegador para enviar notificações.',
      );
      return;
    }

    if (isWebPushSupported()) {
      try {
        await subscribeToPush();
        const result = await sendPushTest();
        if (result.delivered > 0) {
          setPermissionMessage(
            `Push enviado pelo servidor (${result.delivered} dispositivo${result.delivered > 1 ? 's' : ''}).`,
          );
          return;
        }
        setPermissionMessage(
          'Servidor não tinha dispositivo registrado. Tentando notificação local…',
        );
      } catch (e) {
        if (e instanceof PushNotConfiguredError) {
          setPermissionMessage(
            'Web Push não está configurado no servidor. Usando notificação local.',
          );
        } else {
          setPermissionMessage(
            'Falha no push pelo servidor: ' +
              (e instanceof Error ? e.message : 'erro desconhecido') +
              '. Usando notificação local.',
          );
        }
      }
    }

    const ok = showBrowserNotification({
      title: 'Kiki: notificação de teste',
      body: 'Tudo certo! Você verá lembretes assim quando chegar a hora.',
      tag: `kiki:test:${Date.now()}`,
      withSound: notifications.soundEnabled,
      withVibration: notifications.vibrationEnabled,
    });
    if (!ok) {
      setPermissionMessage(
        (prev) =>
          (prev ? prev + ' ' : '') +
          'Não foi possível exibir a notificação local — verifique as permissões do navegador.',
      );
    }
  }, [permission, notifications.soundEnabled, notifications.vibrationEnabled]);

  const load = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const data = await fetchSettings();
      const mapped = dtoToState(data.notifications);
      setNotifications(mapped.notifications);
      setReminderStyle(mapped.reminderStyle);
      setNotificationPrefs(data.notifications);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      setIsLoading(false);
    }
  }, [onSessionExpired, setNotificationPrefs]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissionBanner = useMemo(() => {
    if (!notifications.pushEnabled) return null;
    if (permission === 'unsupported') {
      return {
        tone: 'warning' as const,
        text: 'Este navegador não suporta notificações nativas.',
        action: null,
      };
    }
    if (permission === 'granted') {
      return {
        tone: 'success' as const,
        text: 'Notificações do navegador ativas. Lembretes serão exibidos enquanto a Kiki estiver aberta.',
        action: null,
      };
    }
    if (permission === 'denied') {
      return {
        tone: 'destructive' as const,
        text: 'Notificações bloqueadas. Habilite no cadeado ao lado da URL e atualize a página.',
        action: null,
      };
    }
    return {
      tone: 'info' as const,
      text: 'Conceda permissão para que a Kiki envie lembretes pelo navegador.',
      action: 'request' as const,
    };
  }, [notifications.pushEnabled, permission]);

  const reminderStyles = [
    { name: 'Amigável', description: 'Tom casual e encorajador' },
    { name: 'Profissional', description: 'Comunicação formal e direta' },
    { name: 'Motivacional', description: 'Mensagens energéticas e inspiradoras' },
  ];

  const toggleNotification = (key: keyof NotificationsState) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
    setSaveMessage(null);
  };

  const notificationChannels: Array<{
    title: string;
    items: Array<{
      key: keyof NotificationsState;
      icon: typeof Bell;
      label: string;
      description: string;
      badge?: string;
    }>;
  }> = [
    {
      title: 'Canais de notificação',
      items: [
        {
          key: 'pushEnabled',
          icon: Bell,
          label: 'Notificações no navegador',
          description: 'Receba lembretes nativos do navegador',
        },
        {
          key: 'soundEnabled',
          icon: Bell,
          label: 'Som',
          description: 'Toca um bipe ao notificar',
        },
        {
          key: 'vibrationEnabled',
          icon: Bell,
          label: 'Vibração',
          description: 'Vibra em dispositivos móveis compatíveis',
        },
        {
          key: 'emailEnabled',
          icon: Mail,
          label: 'E-mail',
          description: 'Receba resumos por e-mail',
          badge: 'Em breve',
        },
      ],
    },
    {
      title: 'Tipos de notificação',
      items: [
        {
          key: 'reminders' as const,
          icon: Bell,
          label: 'Lembretes',
          description: 'Alertas de tarefas e compromissos',
        },
        {
          key: 'meetings' as const,
          icon: Calendar,
          label: 'Reuniões',
          description: 'Notificações de reuniões próximas',
        },
        {
          key: 'tasks' as const,
          icon: MessageSquare,
          label: 'Tarefas',
          description: 'Atualizações de tarefas',
        },
        {
          key: 'kikiSuggestions' as const,
          icon: Bell,
          label: 'Sugestões da Kiki',
          description: 'Dicas e sugestões inteligentes',
        },
        {
          key: 'dailySummary' as const,
          icon: Mail,
          label: 'Resumo diário',
          description: 'Receba um resumo do seu dia',
        },
        {
          key: 'weeklyReport' as const,
          icon: Mail,
          label: 'Relatório semanal',
          description: 'Análise semanal de produtividade',
        },
      ],
    },
  ];

  const handleSave = async () => {
    setSaveMessage(null);
    setIsSaving(true);
    try {
      const payload = stateToPayload(notifications, reminderStyle);
      const updated: NotificationPreferencesDto = await patchNotifications(payload);
      setNotificationPrefs(updated);

      if (notifications.pushEnabled) {
        let perm = permission;
        if (perm === 'default') {
          perm = await requestNotificationPermission();
          setPermission(perm);
        }
        if (perm === 'granted' && isWebPushSupported()) {
          try {
            await subscribeToPush();
          } catch {
            // não bloqueia o save
          }
        }
      } else if (isWebPushSupported()) {
        try {
          await unsubscribeFromPush();
        } catch {
          // ignora
        }
      }

      setSaveMessage('Preferências salvas.');
      if (variant === 'modal') {
        onModalSaved?.();
      }
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setSaveMessage(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const bannerToneClass: Record<'success' | 'warning' | 'destructive' | 'info', string> = {
    success:
      'border-green-500/40 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200',
    warning:
      'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
    info: 'border-blue-500/40 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  };

  const body = (
    <>
      {loadError && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
          <button type="button" className="ml-2 underline btn-apple" onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
      )}
      {isLoading && !loadError && (
        <p className="text-sm text-muted-foreground mb-4">Carregando preferências…</p>
      )}

      {permissionBanner && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm ${bannerToneClass[permissionBanner.tone]}`}
        >
          <div className="mt-0.5 shrink-0">
            {permissionBanner.tone === 'success' ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="leading-snug">{permissionBanner.text}</p>
            <div className="flex flex-wrap gap-2">
              {permissionBanner.action === 'request' && (
                <button
                  type="button"
                  onClick={() => void handleRequestPermission()}
                  className="inline-flex items-center rounded-full border border-current/30 px-3 py-1 text-xs font-semibold btn-apple"
                >
                  Permitir notificações
                </button>
              )}
              <button
                type="button"
                disabled={permission === 'unsupported'}
                onClick={() => void handleSendTest()}
                className="inline-flex items-center rounded-full border border-current/30 px-3 py-1 text-xs font-semibold btn-apple disabled:opacity-40"
              >
                Enviar teste
              </button>
            </div>
            {permissionMessage && (
              <p className="text-xs opacity-80">{permissionMessage}</p>
            )}
          </div>
        </div>
      )}

      {!isNotificationApiSupported() && notifications.pushEnabled && (
        <p className="mb-4 text-xs text-muted-foreground">
          As notificações são entregues somente enquanto a Kiki está aberta no navegador.
        </p>
      )}

      <div className="space-y-6">
        {notificationChannels.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              {section.title}
            </h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {section.items.map((item, itemIndex) => {
                const disabled = isLoading || item.badge === 'Em breve';
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 p-4 ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                    } ${item.badge === 'Em breve' ? 'opacity-60' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.label}</p>
                        {item.badge && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleNotification(item.key)}
                      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                        notifications[item.key]
                          ? `bg-gradient-to-br ${themeColor}`
                          : 'bg-gray-300 dark:bg-gray-600'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                          notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-2">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Estilo de lembretes
          </h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Como a Kiki se comunica</p>
                  <p className="text-xs text-muted-foreground">Escolha o tom das mensagens</p>
                </div>
              </div>

              <div className="space-y-2">
                {reminderStyles.map((style) => (
                  <button
                    key={style.name}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setReminderStyle(style.name);
                      setSaveMessage(null);
                    }}
                    className={`w-full p-3 rounded-xl border-2 transition-all btn-apple text-left ${
                      reminderStyle === style.name
                        ? `border-purple-500 bg-purple-50 dark:bg-purple-950/40`
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                          reminderStyle === style.name ? 'border-purple-500' : 'border-gray-300'
                        }`}
                      >
                        {reminderStyle === style.name && (
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm mb-0.5">{style.name}</p>
                        <p className="text-xs text-muted-foreground">{style.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const footer = (
    <>
      {saveMessage && variant === 'page' && (
        <p
          className={`text-center text-sm ${saveMessage.startsWith('Preferências') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
        >
          {saveMessage}
        </p>
      )}
      {saveMessage && variant === 'modal' && !saveMessage.startsWith('Preferências') && (
        <p className="text-center text-sm text-destructive">{saveMessage}</p>
      )}
      {variant === 'modal' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={() => void handleSave()}
            className={`flex-1 bg-gradient-to-br ${themeColor} text-white py-3 rounded-full font-semibold btn-apple-gradient shadow-lg transition-all disabled:opacity-50`}
          >
            {isSaving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onModalCancel?.()}
            className="flex-1 bg-muted text-foreground py-3 rounded-full font-semibold btn-apple"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isSaving || isLoading}
          onClick={() => void handleSave()}
          className={`w-full bg-gradient-to-br ${themeColor} text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all disabled:opacity-50`}
        >
          {isSaving ? 'Salvando…' : 'Salvar preferências'}
        </button>
      )}
    </>
  );

  if (variant === 'modal') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y pr-1">
          {body}
        </div>
        <div className="shrink-0 space-y-2 border-t border-border pt-4 mt-4">{footer}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-8 pb-4 touch-pan-y">
        <button type="button" onClick={onNavigateBack} className={`${backNavButtonClassName} mb-6`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar</span>
        </button>

        <div className="mb-8">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center mb-4`}>
            <Bell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">Notificações</h1>
          <p className="text-sm text-muted-foreground">Gerencie como você recebe alertas e atualizações</p>
        </div>

        {body}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-background p-5">{footer}</div>
    </div>
  );
}
