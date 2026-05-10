import { NotificationPreferencesEditor } from './NotificationPreferencesEditor';
import { useTheme } from './ThemeProvider';
import { useAppShell } from '@/context/AppShellContext';

interface NotificationsScreenProps {
  onNavigateBack?: () => void;
}

export function NotificationsScreen({ onNavigateBack }: NotificationsScreenProps) {
  const { themeColor } = useTheme();
  const { onSessionExpired } = useAppShell();

  return (
    <NotificationPreferencesEditor
      variant="page"
      themeColor={themeColor}
      onSessionExpired={onSessionExpired}
      onNavigateBack={onNavigateBack}
    />
  );
}
