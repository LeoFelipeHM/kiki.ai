import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationsScreen } from '@/components/NotificationsScreen';
import { ROUTES } from '@/navigation/routes';

export function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.profile;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <NotificationsScreen onNavigateBack={() => navigate(from)} />
    </div>
  );
}
