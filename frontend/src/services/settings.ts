import { authorizedFetch, AuthSessionExpiredError } from './auth';

export type ThemeMode = 'light' | 'dark';
export type AssistantVoice = 'feminine' | 'masculine' | 'neutral';

export interface NotificationPreferencesDto {
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
}

export interface IntegrationDto {
  provider: string;
  status: string;
  last_sync_at: string | null;
}

export interface SettingsAggregate {
  ui: {
    theme_mode: ThemeMode;
    assistant_voice: AssistantVoice;
  };
  notifications: NotificationPreferencesDto;
  integrations: IntegrationDto[];
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : Array.isArray(body?.detail)
          ? body.detail.map((x: { msg?: string }) => x.msg).filter(Boolean).join(' ')
          : 'Erro ao processar preferências.';
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchSettings(): Promise<SettingsAggregate> {
  const response = await authorizedFetch('/settings');
  return parseJson<SettingsAggregate>(response);
}

export async function patchUi(partial: {
  theme_mode?: ThemeMode;
  assistant_voice?: AssistantVoice;
}): Promise<SettingsAggregate['ui']> {
  const response = await authorizedFetch('/settings/ui', {
    method: 'PATCH',
    body: JSON.stringify(partial),
  });
  return parseJson<SettingsAggregate['ui']>(response);
}

export async function patchNotifications(
  partial: Partial<NotificationPreferencesDto>,
): Promise<NotificationPreferencesDto> {
  const response = await authorizedFetch('/settings/notifications', {
    method: 'PATCH',
    body: JSON.stringify(partial),
  });
  return parseJson<NotificationPreferencesDto>(response);
}

export async function patchIntegration(provider: string, status: 'connected' | 'disconnected'): Promise<IntegrationDto> {
  const response = await authorizedFetch(`/settings/integrations/${provider}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return parseJson<IntegrationDto>(response);
}

export { AuthSessionExpiredError };
