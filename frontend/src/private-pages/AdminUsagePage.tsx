import { Navigate, useNavigate } from 'react-router-dom';
import { AdminUsageScreen } from '@/components/AdminUsageScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function AdminUsagePage() {
  const navigate = useNavigate();
  const { openMenu, onSessionExpired, userRole } = useAppShell();

  if (userRole !== 'admin') {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <AdminUsageScreen
      onOpenMenu={openMenu}
      onNavigateBack={() => navigate(ROUTES.home)}
      onSessionExpired={onSessionExpired}
    />
  );
}
