import { Navigate } from 'react-router-dom';
import { BlogAdminScreen } from '@/components/BlogAdminScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function AdminBlogPage() {
  const { openMenu, onSessionExpired, userRole } = useAppShell();

  if (userRole !== 'admin') {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <BlogAdminScreen onOpenMenu={openMenu} onSessionExpired={onSessionExpired} />;
}
