import { ArrowLeft, Bell, Mail, MessageSquare, Calendar, Smartphone, Volume2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { useAppShell } from '@/context/AppShellContext';
import {
  AuthSessionExpiredError,
  fetchSettings,
  patchNotifications,
} from '@/services/settings';

interface NotificationsScreenProps {
  onNavigateBack?: () => void;
}

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

export function NotificationsScreen({ onNavigateBack }: NotificationsScreenProps) {
  const { themeColor } = useTheme();
  const { onSessionExpired } = useAppShell();
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
      title: 'Canais de Notificação',
      items: [
        { key: 'pushEnabled' as const, icon: Bell, label: 'Notificações push', description: 'Receba alertas no aplicativo' },
        { key: 'emailEnabled' as const, icon: Mail, label: 'E-mail', description: 'Receba resumos por e-mail' },
        { key: 'smsEnabled' as const, icon: MessageSquare, label: 'SMS', description: 'Alertas urgentes por SMS' },
      ],
    },
    {
      title: 'Configurações de Som',
      items: [
        { key: 'soundEnabled' as const, icon: Volume2, label: 'Som', description: 'Tocar som nas notificações' },
        { key: 'vibrationEnabled' as const, icon: Smartphone, label: 'Vibração', description: 'Vibrar ao receber notificações' },
      ],
    },
    {
      title: 'Tipos de Notificação',
      items: [
        { key: 'reminders' as const, icon: Bell, label: 'Lembretes', description: 'Alertas de tarefas e compromissos' },
        { key: 'meetings' as const, icon: Calendar, label: 'Reuniões', description: 'Notificações de reuniões próximas' },
        { key: 'tasks' as const, icon: MessageSquare, label: 'Tarefas', description: 'Atualizações de tarefas' },
        { key: 'kikiSuggestions' as const, icon: Bell, label: 'Sugestões da Kiki', description: 'Dicas e sugestões inteligentes' },
        { key: 'dailySummary' as const, icon: Mail, label: 'Resumo diário', description: 'Receba um resumo do seu dia' },
        { key: 'weeklyReport' as const, icon: Mail, label: 'Relatório semanal', description: 'Análise semanal de produtividade' },
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

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-5 pt-8 pb-4 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={onNavigateBack}
          className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors btn-apple"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar</span>
        </button>

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

        <div className="mb-8">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center mb-4`}>
            <Bell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie como você recebe alertas e atualizações
          </p>
        </div>

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
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
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
                      className={`relative w-12 h-7 rounded-full transition-colors ${
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

          <div className="mt-6">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Estilo de Lembretes
            </h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
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
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            reminderStyle === style.name ? 'border-purple-500' : 'border-gray-300'
                          }`}
                        >
                          {reminderStyle === style.name && (
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                          )}
                        </div>
                        <div className="flex-1">
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

        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mt-6">
          <p className="text-xs text-purple-700 dark:text-purple-200">
            Dica: Você pode personalizar o horário de "Não perturbe" nas configurações avançadas para silenciar notificações em horários específicos.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-2">
        {saveMessage && (
          <p
            className={`text-center text-sm ${saveMessage.startsWith('Preferências') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
          >
            {saveMessage}
          </p>
        )}
        <button
          type="button"
          disabled={isSaving || isLoading}
          onClick={() => void handleSave()}
          className={`w-full bg-gradient-to-br ${themeColor} text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all disabled:opacity-50`}
        >
          {isSaving ? 'Salvando…' : 'Salvar preferências'}
        </button>
      </div>
    </div>
  );
}
