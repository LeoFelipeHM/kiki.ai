import { useLocation, useNavigate } from 'react-router-dom';
import { AgentsScreen } from '@/components/AgentsScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function AgentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData, openMenu, onSessionExpired } = useAppShell();

  return (
    <AgentsScreen
      onOpenMenu={openMenu}
      onNavigateToHome={() => navigate(ROUTES.home)}
      onNavigateToNotifications={() =>
        navigate(ROUTES.profileNotifications, { state: { from: location.pathname } })
      }
      onNavigateToAgentDetail={(agentId) => navigate(ROUTES.agentDetail(agentId))}
      onSessionExpired={onSessionExpired}
      userName={profileData.name}
    />
  );
}
