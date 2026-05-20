import { useLocation, useNavigate } from 'react-router-dom';
import { ProfileScreen } from '@/components/ProfileScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';
import { profileEditSlugFromLabel } from '@/navigation/profileFields';

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData, onLogout } = useAppShell();

  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.home;

  return (
    <ProfileScreen
      onNavigateBack={() => navigate(from)}
      onEditProfileField={(label) => {
        if (label === 'photo') {
          navigate(ROUTES.profilePhoto);
          return;
        }
        const slug = profileEditSlugFromLabel(label);
        if (slug) navigate(ROUTES.profileEdit(slug));
      }}
      onSecurityNavigation={(type) => {
        if (type === 'Alterar senha') {
          navigate(ROUTES.profilePassword, { state: { from: ROUTES.profile } });
        } else if (type === 'Notificações') {
          navigate(ROUTES.profileNotifications, { state: { from: ROUTES.profile } });
        } else if (type === 'Privacidade') {
          navigate(ROUTES.profilePrivacy);
        } else if (type === 'Gerenciar assinatura') {
          navigate(ROUTES.profileSubscription);
        }
      }}
      onIntegrationNavigation={(type) => {
        const map: Record<string, string> = {
          'Google Calendar': 'google-calendar',
          'Gmail': 'gmail',
          'Outlook': 'outlook',
          'Apple Watch': 'apple-watch',
        };
        const slug = map[type];
        if (slug) navigate(ROUTES.integration(slug), { state: { from: ROUTES.profile } });
      }}
      profileData={profileData}
      onLogout={onLogout}
    />
  );
}
