import {
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  Clock,
  Bell,
  Lock,
  Sparkles,
  ChevronRight,
  Edit2,
  Sun,
  Moon,
  Zap,
  Link,
  ArrowLeft,
  CreditCard,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { VoiceChatOrb } from './VoiceChatOrb';

interface ProfileScreenProps {
  onNavigateBack?: () => void;
  onEditProfileField?: (field: string) => void;
  onSecurityNavigation?: (type: string) => void;
  onIntegrationNavigation?: (type: string) => void;
  onReminderStyleClick?: () => void;
  profileData?: {
    name: string;
    email: string;
    phone: string;
    birthdate: string;
    language: string;
    timezone: string;
  };
}

export function ProfileScreen({ onNavigateBack, onEditProfileField, onSecurityNavigation, onIntegrationNavigation, onReminderStyleClick, profileData = {
  name: 'Maria Silva',
  email: 'maria.silva@email.com',
  phone: '+55 (11) 98765-4321',
  birthdate: '15 de Março, 1995',
  language: 'Português (Brasil)',
  timezone: 'GMT-3 (Brasília)',
} }: ProfileScreenProps) {
  const { themeColor } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileSections = [
    {
      title: 'Perfil Pessoal',
      items: [
        { icon: User, label: 'Nome completo', value: profileData.name },
        { icon: Mail, label: 'E-mail', value: profileData.email },
        { icon: Phone, label: 'Telefone', value: profileData.phone },
        { icon: Calendar, label: 'Data de nascimento', value: profileData.birthdate },
        { icon: Globe, label: 'Idioma', value: profileData.language },
        { icon: Clock, label: 'Fuso horário', value: profileData.timezone },
      ],
    },
    {
      title: 'Conta e Segurança',
      items: [
        { icon: Lock, label: 'Alterar senha', value: '' },
        { icon: User, label: 'Privacidade', value: 'Configurar' },
        { icon: CreditCard, label: 'Gerenciar assinatura', value: 'Plano Premium' },
      ],
    },
  ];

  const routinePreferences = [
    { time: 'Manhã', activity: 'Foco profundo e reuniões importantes' },
    { time: 'Tarde', activity: 'Reuniões de equipe e reviews' },
    { time: 'Noite', activity: 'Tempo pessoal e planejamento' },
  ];

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-16 scrollbar-hide bg-background">
      <div className="px-5 pt-8 pb-4">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors btn-apple"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar</span>
        </button>

        {/* Profile Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-3xl text-white shadow-lg`}>
              {profileData.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => onEditProfileField?.('photo')}
              className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-br ${themeColor} shadow-lg flex items-center justify-center border-2 border-background btn-apple hover:opacity-90`}
            >
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          </div>
          <h1 className="text-2xl mb-1 mt-3">{profileData.name}</h1>
          <p className="text-sm text-muted-foreground">{profileData.email}</p>
        </div>


        {/* Profile Sections */}
        <div className="space-y-5">
          {profileSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xs mb-2 text-muted-foreground">{section.title}</h3>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => {
                      if (section.title === 'Perfil Pessoal') {
                        onEditProfileField?.(item.label);
                      } else if (section.title === 'Conta e Segurança') {
                        onSecurityNavigation?.(item.label);
                      }
                    }}
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

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
      </div>

      <VoiceChatOrb />

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
