import {
  User,
  Bell,
  Moon,
  Lock,
  Calendar as CalendarIcon,
  Volume2,
  ChevronRight,
  LogOut,
  Menu,
  Check,
  Sun,
  Mail,
  Watch,
} from 'lucide-react';
import { useState } from 'react';
import { VoiceChatOrb } from './VoiceChatOrb';
import { useTheme } from './ThemeProvider';

interface SettingsScreenProps {
  onNavigateToProfile?: () => void;
  onOpenMenu?: () => void;
  onNavigateToHome?: () => void;
  onSecurityNavigation?: (type: string) => void;
  onIntegrationNavigation?: (type: string) => void;
  userName?: string;
  userEmail?: string;
}

export function SettingsScreen({ onNavigateToProfile, onOpenMenu, onNavigateToHome, onSecurityNavigation, onIntegrationNavigation, userName = 'Maria Silva', userEmail = 'maria.silva@email.com' }: SettingsScreenProps) {
  const { themeColor } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');
  const [selectedVoice, setSelectedVoice] = useState('Feminina');
  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun, description: 'Interface com fundo claro' },
    { value: 'dark', label: 'Escuro', icon: Moon, description: 'Interface com fundo escuro' },
  ];

  const voiceOptions = [
    { value: 'Feminina', label: 'Feminina', description: 'Voz padrão da Kiki' },
    { value: 'Masculina', label: 'Masculina', description: 'Voz masculina alternativa' },
    { value: 'Neutra', label: 'Neutra', description: 'Voz neutra e profissional' },
  ];

  const handleThemeSave = () => {
    // Theme will be applied when saved
    setShowThemeModal(false);
  };

  const handleVoiceSave = () => {
    setShowVoiceModal(false);
  };

  const settingsSections = [
    {
      title: 'Preferências',
      items: [
        { icon: Bell, label: 'Notificações', value: 'Ativadas', action: 'navigate' },
        { icon: Moon, label: 'Tema', value: selectedTheme === 'light' ? 'Claro' : 'Escuro', action: 'popup' },
        { icon: Volume2, label: 'Voz da assistente', value: selectedVoice, action: 'popup' },
      ],
    },
    {
      title: 'Integrações',
      items: [
        { icon: CalendarIcon, label: 'Google Calendar', value: 'Conectado', action: 'integration' },
        { icon: Mail, label: 'Gmail', value: 'Não conectado', action: 'integration' },
        { icon: CalendarIcon, label: 'Outlook', value: 'Não conectado', action: 'integration' },
        { icon: Watch, label: 'Apple Watch', value: 'Não conectado', action: 'integration' },
      ],
    },
  ];

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
            onClick={onOpenMenu}
            className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center btn-apple"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
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

        <div className="mb-5">
          <button
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
            <div key={sectionIndex}>
              <h3 className="text-xs mb-2 text-muted-foreground">{section.title}</h3>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => handleItemClick(section.title, item.label, item.action)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted btn-apple ${
                      itemIndex !== section.items.length - 1
                        ? 'border-b border-border'
                        : ''
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

      {/* Theme Modal */}
      {showThemeModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setShowThemeModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6">
            <h2 className="text-xl mb-4">Tema do aplicativo</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Escolha como você prefere visualizar o aplicativo
            </p>

            <div className="space-y-3 mb-6">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTheme(option.value as 'light' | 'dark')}
                  className={`w-full p-4 rounded-xl border-2 transition-all btn-apple text-left ${
                    selectedTheme === option.value ? `border-purple-500 bg-purple-50` : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        selectedTheme === option.value ? 'border-purple-500' : 'border-gray-300'
                      }`}
                    >
                      {selectedTheme === option.value && <div className="w-3 h-3 rounded-full bg-purple-500" />}
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
                onClick={handleThemeSave}
                className={`w-full bg-gradient-to-br ${themeColor} text-white py-3 rounded-full font-semibold btn-apple-gradient`}
              >
                Salvar
              </button>
              <button
                onClick={() => setShowThemeModal(false)}
                className="w-full bg-muted text-foreground py-3 rounded-full font-semibold btn-apple"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Voice Modal */}
      {showVoiceModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setShowVoiceModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6">
            <h2 className="text-xl mb-4">Voz da assistente</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Escolha a voz que a Kiki usará para falar com você
            </p>

            <div className="space-y-3 mb-6">
              {voiceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedVoice(option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all btn-apple text-left ${
                    selectedVoice === option.value ? `border-purple-500 bg-purple-50` : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        selectedVoice === option.value ? 'border-purple-500' : 'border-gray-300'
                      }`}
                    >
                      {selectedVoice === option.value && <div className="w-3 h-3 rounded-full bg-purple-500" />}
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
                onClick={handleVoiceSave}
                className={`w-full bg-gradient-to-br ${themeColor} text-white py-3 rounded-full font-semibold btn-apple-gradient`}
              >
                Salvar
              </button>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="w-full bg-muted text-foreground py-3 rounded-full font-semibold btn-apple"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6">
            <h2 className="text-xl mb-4">Sair da conta?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  // Aqui implementaria a lógica de logout
                  setShowLogoutModal(false);
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold btn-apple transition-all"
              >
                Sim, sair da conta
              </button>
              <button
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
