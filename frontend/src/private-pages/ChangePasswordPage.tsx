import { useLocation, useNavigate } from 'react-router-dom';
import { ChangePasswordScreen } from '@/components/ChangePasswordScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { onLogout } = useAppShell();
  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.profile;

  return (
    <ChangePasswordScreen
      onNavigateBack={() => navigate(from)}
      onSuccess={onLogout}
    />
  );
}
