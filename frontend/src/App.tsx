import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { ChatScreen } from './components/ChatScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { NotesScreen } from './components/NotesScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { EditProfileField } from './components/EditProfileField';
import { EditProfilePhoto } from './components/EditProfilePhoto';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { PrivacyScreen } from './components/PrivacyScreen';
import { DeleteAccountScreen } from './components/DeleteAccountScreen';
import { ManageSubscriptionScreen } from './components/ManageSubscriptionScreen';
import { IntegrationScreen } from './components/IntegrationScreen';
import { SideMenu } from './components/SideMenu';
import { ThemeProvider } from './components/ThemeProvider';
import type { CalendarEvent } from './types/calendar';

type Screen = 'home' | 'chat' | 'calendar' | 'notes' | 'settings' | 'profile' | 'edit-profile-field' | 'edit-profile-photo' | 'change-password' | 'notifications' | 'privacy' | 'delete-account' | 'manage-subscription' | 'integration';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [editingField, setEditingField] = useState<string>('');
  const [integrationType, setIntegrationType] = useState<string>('');
  const [themeColor, setThemeColor] = useState('from-purple-500 to-pink-500');
  const [profileData, setProfileData] = useState({
    name: 'Maria Silva',
    email: 'maria.silva@email.com',
    phone: '+55 (11) 98765-4321',
    birthdate: '15 de Março, 1995',
    language: 'Português (Brasil)',
    timezone: 'GMT-3 (Brasília)',
  });

  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: 1, title: 'Reunião com equipe', day: 28, startHour: 10, duration: 1, type: 'meeting', guests: ['João', 'Maria'], description: 'Discutir roadmap do projeto' },
    { id: 2, title: 'Foco profundo', day: 28, startHour: 14, duration: 2, type: 'task', description: 'Desenvolver nova feature' },
    { id: 3, title: 'Call com cliente', day: 28, startHour: 16, duration: 1, type: 'meeting', guests: ['Cliente XYZ'] },
    { id: 4, title: 'Academia', day: 29, startHour: 7, duration: 1, type: 'personal' },
    { id: 5, title: 'Code review', day: 29, startHour: 10, duration: 1, type: 'task' },
    { id: 6, title: 'Almoço com time', day: 29, startHour: 12, duration: 1, type: 'personal', guests: ['Time dev'] },
    { id: 7, title: 'Planejamento sprint', day: 30, startHour: 9, duration: 2, type: 'meeting', guests: ['Equipe completa'], description: 'Planejar próxima sprint' },
    { id: 8, title: 'Igreja', day: 27, startHour: 10, duration: 2, type: 'personal' },
    { id: 9, title: 'Mercado', day: 33, startHour: 15, duration: 1, type: 'personal' },
  ]);

  const navigateToProfile = () => {
    setPreviousScreen(activeScreen);
    setActiveScreen('profile');
  };

  const handleEditProfileField = (field: string) => {
    if (field === 'photo') {
      setActiveScreen('edit-profile-photo');
    } else {
      setEditingField(field);
      setActiveScreen('edit-profile-field');
    }
  };

  const handleSecurityNavigation = (type: string) => {
    setPreviousScreen(activeScreen);
    if (type === 'Alterar senha') {
      setActiveScreen('change-password');
    } else if (type === 'Notificações') {
      setActiveScreen('notifications');
    } else if (type === 'Privacidade') {
      setActiveScreen('privacy');
    } else if (type === 'Gerenciar assinatura') {
      setActiveScreen('manage-subscription');
    }
  };

  const handleIntegrationNavigation = (type: string) => {
    setPreviousScreen(activeScreen);
    setIntegrationType(type);
    setActiveScreen('integration');
  };

  const handleSaveProfileField = (value: string) => {
    const fieldMap: { [key: string]: keyof typeof profileData } = {
      'Nome completo': 'name',
      'E-mail': 'email',
      'Telefone': 'phone',
      'Data de nascimento': 'birthdate',
      'Idioma': 'language',
      'Fuso horário': 'timezone',
    };

    const dataKey = fieldMap[editingField];
    if (dataKey) {
      setProfileData({ ...profileData, [dataKey]: value });
    }
  };

  const getCurrentFieldValue = () => {
    const fieldMap: { [key: string]: keyof typeof profileData } = {
      'Nome completo': 'name',
      'E-mail': 'email',
      'Telefone': 'phone',
      'Data de nascimento': 'birthdate',
      'Idioma': 'language',
      'Fuso horário': 'timezone',
    };

    const dataKey = fieldMap[editingField];
    return dataKey ? profileData[dataKey] : '';
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToChat={() => setActiveScreen('chat')}
            onNavigateToCalendar={(viewMode?: 'day' | 'week' | 'month' | 'year') => {
              if (viewMode) setCalendarViewMode(viewMode);
              setActiveScreen('calendar');
            }}
            onNavigateToProfile={navigateToProfile}
            onOpenMenu={() => setIsMenuOpen(true)}
            events={events}
            userName={profileData.name}
          />
        );
      case 'chat':
        return <ChatScreen onOpenMenu={() => setIsMenuOpen(true)} onNavigateToProfile={navigateToProfile} onNavigateToHome={() => setActiveScreen('home')} userName={profileData.name} />;
      case 'calendar':
        return (
          <CalendarScreen
            onOpenMenu={() => setIsMenuOpen(true)}
            onNavigateToProfile={navigateToProfile}
            onNavigateToHome={() => setActiveScreen('home')}
            initialViewMode={calendarViewMode}
            events={events}
            setEvents={setEvents}
          />
        );
      case 'notes':
        return (
          <NotesScreen
            onOpenMenu={() => setIsMenuOpen(true)}
            onNavigateToProfile={navigateToProfile}
            onNavigateToHome={() => setActiveScreen('home')}
            userName={profileData.name}
          />
        );
      case 'settings':
      case 'profile':
        return (
          <ProfileScreen
            onNavigateBack={() => setActiveScreen(previousScreen)}
            onEditProfileField={handleEditProfileField}
            onSecurityNavigation={handleSecurityNavigation}
            onIntegrationNavigation={handleIntegrationNavigation}
            profileData={profileData}
          />
        );
      case 'edit-profile-field':
        return (
          <EditProfileField
            field={editingField}
            currentValue={getCurrentFieldValue()}
            onNavigateBack={() => setActiveScreen('profile')}
            onSave={handleSaveProfileField}
          />
        );
      case 'edit-profile-photo':
        return (
          <EditProfilePhoto
            onNavigateBack={() => setActiveScreen('profile')}
            onSaveColor={(color) => setThemeColor(color)}
            currentColor={themeColor}
            userName={profileData.name}
          />
        );
      case 'change-password':
        return <ChangePasswordScreen onNavigateBack={() => setActiveScreen('profile')} />;
      case 'notifications':
        return <NotificationsScreen onNavigateBack={() => setActiveScreen(previousScreen)} />;
      case 'privacy':
        return <PrivacyScreen onNavigateBack={() => setActiveScreen('profile')} onDeleteAccount={() => setActiveScreen('delete-account')} />;
      case 'delete-account':
        return <DeleteAccountScreen onNavigateBack={() => setActiveScreen('privacy')} onManageSubscription={() => setActiveScreen('manage-subscription')} />;
      case 'manage-subscription':
        return <ManageSubscriptionScreen onNavigateBack={() => setActiveScreen('profile')} />;
      case 'integration':
        return <IntegrationScreen onNavigateBack={() => setActiveScreen(previousScreen)} integrationType={integrationType} />;
      default:
        return (
          <HomeScreen
            onNavigateToChat={() => setActiveScreen('chat')}
            onNavigateToCalendar={() => setActiveScreen('calendar')}
            onOpenMenu={() => setIsMenuOpen(true)}
            events={events}
            userName={profileData.name}
          />
        );
    }
  };

  return (
    <ThemeProvider themeColor={themeColor}>
      <div className="size-full flex flex-col bg-background max-w-md mx-auto">
        {renderScreen()}

        <SideMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onNavigate={(screen) => {
            if (screen === 'calendar') {
              setCalendarViewMode('week');
            }
            setActiveScreen(screen);
          }}
          currentScreen={activeScreen}
          userName={profileData.name}
          userEmail={profileData.email}
        />
      </div>
    </ThemeProvider>
  );
}