import { useNavigate } from 'react-router-dom';
import { SettingsScreen } from '@/components/SettingsScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function SettingsPage() {
  const navigate = useNavigate();
  const { profileData, onLogout, openMenu } = useAppShell();

  return (
    <SettingsScreen
      userName={profileData.name}
      userEmail={profileData.email}
      userNickname={profileData.nickname}
      onOpenMenu={openMenu}
      onNavigateToHome={() => navigate(ROUTES.home)}
      onNavigateToProfile={() =>
        navigate(ROUTES.profile, { state: { from: ROUTES.settings } })
      }
      onNavigateToNotifications={() =>
        navigate(ROUTES.profileNotifications, { state: { from: ROUTES.settings } })
      }
      onLogout={onLogout}
      onSecurityNavigation={(type) => {
        if (type === 'Alterar senha') {
          navigate(ROUTES.profilePassword, { state: { from: ROUTES.settings } });
        } else if (type === 'Privacidade') {
          navigate(ROUTES.profilePrivacy, { state: { from: ROUTES.settings } });
        } else if (type === 'Gerenciar assinatura') {
          navigate(ROUTES.profileSubscription, { state: { from: ROUTES.settings } });
        }
      }}
      onIntegrationNavigation={(type) => {
        const map: Record<string, string> = {
          'Google Calendar': 'google-calendar',
          Gmail: 'gmail',
          Outlook: 'outlook',
          'Apple Watch': 'apple-watch',
        };
        const slug = map[type];
        if (slug) navigate(ROUTES.integration(slug), { state: { from: ROUTES.settings } });
      }}
    />
  );
}
