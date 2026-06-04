import { useLocation, useNavigate } from 'react-router-dom';
import { HomeScreen } from '@/components/HomeScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { events, profileData, openMenu } = useAppShell();

  return (
    <HomeScreen
      onNavigateToChat={() => navigate(ROUTES.chat)}
      onNavigateToCalendar={(viewMode) => {
        const v = viewMode ?? 'week';
        navigate(`${ROUTES.calendar}?view=${v}`);
      }}
      onNavigateToNotifications={() =>
        navigate(ROUTES.profileNotifications, { state: { from: location.pathname } })
      }
      onOpenMenu={openMenu}
      events={events}
      userName={profileData.name}
    />
  );
}
