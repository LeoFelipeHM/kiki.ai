import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarScreen } from '@/components/CalendarScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';
import { parseCalendarViewParam } from '@/navigation/calendarViews';

export function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { events, setEvents, openMenu, onSessionExpired } = useAppShell();
  const initialViewMode = parseCalendarViewParam(searchParams.get('view'));

  return (
    <CalendarScreen
      onOpenMenu={openMenu}
      onNavigateToProfile={() => navigate(ROUTES.profile, { state: { from: location.pathname } })}
      onNavigateToHome={() => navigate(ROUTES.home)}
      onSessionExpired={onSessionExpired}
      initialViewMode={initialViewMode}
      events={events}
      setEvents={setEvents}
    />
  );
}
