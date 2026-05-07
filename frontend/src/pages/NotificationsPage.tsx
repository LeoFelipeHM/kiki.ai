import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationsScreen } from '@/components/NotificationsScreen';
import { ROUTES } from '@/navigation/routes';

export function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.profile;

  return <NotificationsScreen onNavigateBack={() => navigate(from)} />;
}
