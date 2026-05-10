import { ArrowLeft, Bell, Mail, MessageSquare, Calendar, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { backNavButtonClassName } from '@/lib/backNavButton';
import {
  AuthSessionExpiredError,
  fetchSettings,
  patchNotifications,
} from '@/services/settings';

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

  const load = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const data = await fetchSettings();
      const mapped = dtoToState(data.notifications);
      setNotifications(mapped.notifications);
      setReminderStyle(mapped.reminderStyle);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Não foi possível carregar.');
    } finally {
      setIsLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  const reminderStyles = [
    { name: 'Amigável', description: 'Tom casual e encorajador' },
    { name: 'Profissional', description: 'Comunicação formal e direta' },
    { name: 'Motivacional', description: 'Mensagens energéticas e inspiradoras' },
  ];

  const toggleNotification = (key: keyof NotificationsState) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
    setSaveMessage(null);
  };

  const notificationChannels = [
    {
      title: 'Canais de notificação',
      items: [
        {
          key: 'pushEnabled' as const,
          icon: Bell,
          label: 'Notificações push',
          description: 'Receba alertas no aplicativo',
        },
        {
          key: 'emailEnabled' as const,
          icon: Mail,
          label: 'E-mail',
          description: 'Receba resumos por e-mail',
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
      await patchNotifications(payload);
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

      <div className="space-y-6">
        {notificationChannels.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              {section.title}
            </h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {section.items.map((item, itemIndex) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-3 p-4 ${
                    itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => toggleNotification(item.key)}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                      notifications[item.key]
                        ? `bg-gradient-to-br ${themeColor}`
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
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
