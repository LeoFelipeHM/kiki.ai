import { Navigate, useNavigate } from 'react-router-dom';
import { AdminUsersScreen } from '@/components/AdminUsersScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { openMenu, currentUserId, onSessionExpired, userRole } = useAppShell();

  if (userRole !== 'admin') {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <AdminUsersScreen
      onOpenMenu={openMenu}
      onNavigateBack={() => navigate(ROUTES.home)}
      currentUserId={currentUserId}
      onSessionExpired={onSessionExpired}
    />
  );
}
