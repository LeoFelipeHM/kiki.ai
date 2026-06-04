import { useLocation, useNavigate } from 'react-router-dom';
import { NotesScreen } from '@/components/NotesScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function NotesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData, openMenu, onSessionExpired } = useAppShell();

  return (
    <NotesScreen
      onOpenMenu={openMenu}
      onNavigateToNotifications={() =>
        navigate(ROUTES.profileNotifications, { state: { from: location.pathname } })
      }
      onNavigateToHome={() => navigate(ROUTES.home)}
      onSessionExpired={onSessionExpired}
      userName={profileData.name}
    />
  );
}
