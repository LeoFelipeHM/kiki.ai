import {
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  Clock,
  Lock,
  ChevronRight,
  Edit2,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { backNavButtonClassName } from '@/lib/backNavButton';
import { useTheme } from './ThemeProvider';
import { VoiceChatOrb } from './VoiceChatOrb';

interface ProfileScreenProps {
  onNavigateBack?: () => void;
  onEditProfileField?: (field: string) => void;
  onSecurityNavigation?: (type: string) => void;
  onIntegrationNavigation?: (type: string) => void;
  onLogout?: () => void;
  onReminderStyleClick?: () => void;
  profileData?: {
    name: string;
    email: string;
    nickname: string;
    phone: string;
    birthdate: string;
    language: string;
    timezone: string;
  };
}

export function ProfileScreen({ onNavigateBack, onEditProfileField, onSecurityNavigation, onIntegrationNavigation, onLogout, onReminderStyleClick, profileData = {
  name: 'Maria Silva',
  email: 'maria.silva@email.com',
  nickname: 'maria_silva',
  phone: '+55 (11) 98765-4321',
  birthdate: '15 de Março, 1995',
  language: 'Português (Brasil)',
  timezone: 'America/Sao_Paulo',
} }: ProfileScreenProps) {
  const { themeColor } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileSections = [
    {
      title: 'Perfil Pessoal',
      items: [
        { icon: User, label: 'Nome completo', value: profileData.name },
        { icon: User, label: 'Nickname', value: profileData.nickname ? `@${profileData.nickname}` : '' },
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
        <button type="button" onClick={onNavigateBack} className={`${backNavButtonClassName} mb-4`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar</span>
        </button>

        {/* Profile Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group/avatar">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-3xl text-white shadow-lg transition-[transform,box-shadow] duration-300 ease-out motion-safe:group-hover/avatar:scale-[1.06] motion-safe:group-hover/avatar:shadow-xl`}
            >
              {profileData.name.charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={() => onEditProfileField?.('photo')}
              className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-br ${themeColor} shadow-lg flex items-center justify-center border-2 border-background btn-apple transition-transform duration-200 ease-out hover:scale-110 active:scale-95`}
            >
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          </div>
          <h1 className="text-2xl mb-1 mt-3">{profileData.name}</h1>
          {profileData.nickname ? (
            <p className="text-sm text-muted-foreground">@{profileData.nickname}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{profileData.email}</p>
        </div>


        {/* Profile Sections */}
        <div className="space-y-5">
          {profileSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xs mb-2 text-muted-foreground">{section.title}</h3>
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-[box-shadow,border-color] duration-300 ease-out hover:border-muted-foreground/20 hover:shadow-md motion-safe:hover:-translate-y-px">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    type="button"
                    onClick={() => {
                      if (section.title === 'Perfil Pessoal') {
                        onEditProfileField?.(item.label);
                      } else if (section.title === 'Conta e Segurança') {
                        onSecurityNavigation?.(item.label);
                      }
                    }}
                    className={`group/item flex w-full items-center gap-3 p-3 btn-apple transition-colors duration-200 hover:bg-muted/90 active:bg-muted ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted transition-[transform,background-color] duration-200 ease-out motion-safe:group-hover/item:scale-105 motion-safe:group-hover/item:bg-background">
                      <item.icon className="w-4 h-4 text-foreground transition-transform duration-200 motion-safe:group-hover/item:scale-110" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm transition-colors duration-200 group-hover/item:text-foreground">
                        {item.label}
                      </p>
                      {item.value && (
                        <p className="text-xs text-muted-foreground transition-colors duration-200 group-hover/item:text-muted-foreground">
                          {item.value}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-[transform,color] duration-200 ease-out motion-safe:group-hover/item:translate-x-1 motion-safe:group-hover/item:text-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="text-sm text-red-500 transition-all duration-200 ease-out hover:text-red-600 motion-safe:hover:scale-[1.03] active:scale-[0.98]"
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
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout?.();
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold btn-apple transition-colors duration-200"
              >
                Sim, sair da conta
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-full bg-muted text-foreground py-3 rounded-full font-semibold btn-apple transition-colors duration-200 hover:bg-muted/80"
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
