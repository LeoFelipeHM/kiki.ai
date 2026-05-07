import {
  Bell,
  Moon,
  Calendar as CalendarIcon,
  Volume2,
  ChevronRight,
  LogOut,
  Menu,
  Sun,
  Mail,
  Watch,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VoiceChatOrb } from './VoiceChatOrb';
import { useTheme } from './ThemeProvider';
import { useAppShell } from '@/context/AppShellContext';
import { AuthSessionExpiredError, fetchSettings, patchUi } from '@/services/settings';

const VOICE_LABEL_TO_API: Record<string, 'feminine' | 'masculine' | 'neutral'> = {
  Feminina: 'feminine',
  Masculina: 'masculine',
  Neutra: 'neutral',
};

const VOICE_API_TO_LABEL: Record<string, string> = {
  feminine: 'Feminina',
  masculine: 'Masculina',
  neutral: 'Neutra',
};

const PROVIDER_LABELS: Record<string, string> = {
  google_calendar: 'Google Calendar',
  gmail: 'Gmail',
  outlook: 'Outlook',
  apple_watch: 'Apple Watch',
};

const INTEGRATION_ORDER = ['google_calendar', 'gmail', 'outlook', 'apple_watch'] as const;

function integrationIcon(label: string) {
  if (label === 'Gmail' || label === 'Outlook') return Mail;
  if (label === 'Apple Watch') return Watch;
  return CalendarIcon;
}

function formatIntegrationStatus(status: string): string {
  if (status === 'connected') return 'Conectado';
  if (status === 'error') return 'Erro';
  return 'Não conectado';
}

function notificationSummary(n: {
  push_enabled: boolean;
  email_enabled: boolean;
}): string {
  if (n.push_enabled || n.email_enabled) return 'Ativadas';
  return 'Desativadas';
}

interface SettingsScreenProps {
  onNavigateToProfile?: () => void;
  onOpenMenu?: () => void;
  onNavigateToHome?: () => void;
  onSecurityNavigation?: (type: string) => void;
  onIntegrationNavigation?: (type: string) => void;
  onLogout?: () => Promise<void>;
  userName?: string;
  userEmail?: string;
}

export function SettingsScreen({
  onNavigateToProfile,
  onOpenMenu,
  onNavigateToHome,
  onSecurityNavigation,
  onIntegrationNavigation,
  onLogout,
  userName = 'Maria Silva',
  userEmail = 'maria.silva@email.com',
}: SettingsScreenProps) {
  const { themeColor } = useTheme();
  const { setAppearance, onSessionExpired } = useAppShell();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingUi, setIsSavingUi] = useState(false);
  const [notifSummary, setNotifSummary] = useState('Ativadas');
  const [integrationRows, setIntegrationRows] = useState<
    { provider: string; label: string; value: string }[]
  >([]);

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [selectedVoice, setSelectedVoice] = useState('Feminina');

  const load = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const data = await fetchSettings();
      setAppearance(data.ui.theme_mode);
      setSelectedTheme(data.ui.theme_mode);
      setSelectedVoice(VOICE_API_TO_LABEL[data.ui.assistant_voice] ?? 'Feminina');
      setNotifSummary(notificationSummary(data.notifications));
      const rank = (p: string) => {
        const i = (INTEGRATION_ORDER as readonly string[]).indexOf(p);
        return i === -1 ? 999 : i;
      };
      const sorted = [...data.integrations].sort((a, b) => rank(a.provider) - rank(b.provider));
      setIntegrationRows(
        sorted.map((row) => ({
          provider: row.provider,
          label: PROVIDER_LABELS[row.provider] ?? row.provider,
          value: formatIntegrationStatus(row.status),
        })),
      );
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Não foi possível carregar as configurações.');
    } finally {
      setIsLoading(false);
    }
  }, [setAppearance, onSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  const themeOptions = [
    { value: 'light' as const, label: 'Claro', icon: Sun, description: 'Interface com fundo claro' },
    { value: 'dark' as const, label: 'Escuro', icon: Moon, description: 'Interface com fundo escuro' },
  ];

  const voiceOptions = [
    { value: 'Feminina', label: 'Feminina', description: 'Voz padrão da Kiki' },
    { value: 'Masculina', label: 'Masculina', description: 'Voz masculina alternativa' },
    { value: 'Neutra', label: 'Neutra', description: 'Voz neutra e profissional' },
  ];

  const handleThemeSave = async () => {
    setIsSavingUi(true);
    try {
      await patchUi({ theme_mode: selectedTheme });
      setAppearance(selectedTheme);
      setShowThemeModal(false);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Falha ao salvar tema.');
    } finally {
      setIsSavingUi(false);
    }
  };

  const handleVoiceSave = async () => {
    const apiVoice = VOICE_LABEL_TO_API[selectedVoice];
    if (!apiVoice) return;
    setIsSavingUi(true);
    try {
      await patchUi({ assistant_voice: apiVoice });
      setShowVoiceModal(false);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Falha ao salvar voz.');
    } finally {
      setIsSavingUi(false);
    }
  };

  const settingsSections = useMemo(
    () => [
      {
        title: 'Preferências',
        items: [
          { icon: Bell, label: 'Notificações', value: notifSummary, action: 'navigate' as const },
          {
            icon: Moon,
            label: 'Tema',
            value: selectedTheme === 'light' ? 'Claro' : 'Escuro',
            action: 'popup' as const,
          },
          { icon: Volume2, label: 'Voz da assistente', value: selectedVoice, action: 'popup' as const },
        ],
      },
      {
        title: 'Integrações',
        items: integrationRows.map((row) => ({
          icon: integrationIcon(row.label),
          label: row.label,
          value: row.value,
          action: 'integration' as const,
        })),
      },
    ],
    [notifSummary, selectedTheme, selectedVoice, integrationRows],
  );

  const handleItemClick = (section: string, label: string, action: string) => {
    if (action === 'navigate') {
      if (label === 'Notificações') {
        onSecurityNavigation?.('Notificações');
      }
    } else if (action === 'popup') {
      if (label === 'Tema') {
        setShowThemeModal(true);
      } else if (label === 'Voz da assistente') {
        setShowVoiceModal(true);
      }
    } else if (action === 'integration') {
      onIntegrationNavigation?.(label);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center btn-apple"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onNavigateToHome}
              className="text-xl font-semibold btn-apple"
            >
              Kiki
            </button>
            <div className="w-10" />
          </div>
          <div className="mb-5">
            <h1 className="text-2xl">Configurações</h1>
          </div>

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

          <div className="mb-5">
            <button
              type="button"
              onClick={onNavigateToProfile}
              className={`w-full flex items-center gap-3 bg-gradient-to-br ${themeColor} rounded-2xl p-4 text-white card-apple overflow-hidden btn-apple-gradient`}
            >
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-base mb-0.5 text-white">{userName}</h2>
                <p className="text-sm text-white/80">{userEmail}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </button>
          </div>

          <div className="space-y-4">
            {settingsSections.map((section, sectionIndex) => (
              <div key={section.title}>
                <h3 className="text-xs mb-2 text-muted-foreground">{section.title}</h3>
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {section.items.map((item, itemIndex) => (
                    <button
                      key={`${section.title}-${item.label}`}
                      type="button"
                      disabled={isLoading && section.title === 'Integrações'}
                      onClick={() => handleItemClick(section.title, item.label, item.action)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-muted btn-apple ${
                        itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm">{item.label}</p>
                        {item.value && (
                          <p className="text-xs text-muted-foreground">{item.value}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-center gap-2.5 bg-destructive text-destructive-foreground rounded-2xl p-3 text-sm btn-apple"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da conta</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1.5">KIKI Assistente v1.0.0</p>
            <p className="text-[10px] text-muted-foreground">
              © 2026 KIKI. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      <VoiceChatOrb />

      {showThemeModal && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setShowThemeModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6">
            <h2 className="text-xl mb-4">Tema do aplicativo</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Escolha como você prefere visualizar o aplicativo
            </p>

            <div className="space-y-3 mb-6">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedTheme(option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all btn-apple text-left ${
                    selectedTheme === option.value ? `border-purple-500 bg-purple-50 dark:bg-purple-950/40` : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        selectedTheme === option.value ? 'border-purple-500' : 'border-gray-300'
                      }`}
                    >
                      {selectedTheme === option.value && (
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm mb-1 flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={isSavingUi}
                onClick={() => void handleThemeSave()}
                className={`w-full bg-gradient-to-br ${themeColor} text-white py-3 rounded-full font-semibold btn-apple-gradient disabled:opacity-50`}
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="w-full bg-muted text-foreground py-3 rounded-full font-semibold btn-apple"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {showVoiceModal && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setShowVoiceModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6">
            <h2 className="text-xl mb-4">Voz da assistente</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Escolha a voz que a Kiki usará para falar com você
            </p>

            <div className="space-y-3 mb-6">
              {voiceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedVoice(option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all btn-apple text-left ${
                    selectedVoice === option.value ? `border-purple-500 bg-purple-50 dark:bg-purple-950/40` : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        selectedVoice === option.value ? 'border-purple-500' : 'border-gray-300'
                      }`}
                    >
                      {selectedVoice === option.value && (
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm mb-1">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={isSavingUi}
                onClick={() => void handleVoiceSave()}
                className={`w-full bg-gradient-to-br ${themeColor} text-white py-3 rounded-full font-semibold btn-apple-gradient disabled:opacity-50`}
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setShowVoiceModal(false)}
                className="w-full bg-muted text-foreground py-3 rounded-full font-semibold btn-apple"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {showLogoutModal && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6">
            <h2 className="text-xl mb-4">Sair da conta?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  void onLogout?.();
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold btn-apple transition-all"
              >
                Sim, sair da conta
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-full bg-muted text-foreground py-3 rounded-full font-semibold btn-apple"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
