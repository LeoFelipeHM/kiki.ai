import { useLocation, useNavigate } from 'react-router-dom';
import { ContactsScreen } from '@/components/ContactsScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function ContactsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData, openMenu, onSessionExpired } = useAppShell();

  return (
    <ContactsScreen
      onOpenMenu={openMenu}
      onNavigateToProfile={() => navigate(ROUTES.profile, { state: { from: location.pathname } })}
      onNavigateToHome={() => navigate(ROUTES.home)}
      onSessionExpired={onSessionExpired}
      userName={profileData.name}
    />
  );
}
