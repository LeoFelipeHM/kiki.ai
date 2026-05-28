import { useLocation, useNavigate } from 'react-router-dom';
import { ChatScreen } from '@/components/ChatScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData, openMenu } = useAppShell();

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <ChatScreen
        onOpenMenu={openMenu}
        onNavigateToProfile={() => navigate(ROUTES.profile, { state: { from: location.pathname } })}
        onNavigateToHome={() => navigate(ROUTES.home)}
        userName={profileData.name}
      />
    </div>
  );
}
