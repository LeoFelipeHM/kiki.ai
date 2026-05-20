import { useNavigate } from 'react-router-dom';
import { PrivacyScreen } from '@/components/PrivacyScreen';
import { ROUTES } from '@/navigation/routes';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <PrivacyScreen
      onNavigateBack={() => navigate(ROUTES.profile)}
      onDeleteAccount={() => navigate(ROUTES.profileDeleteAccount)}
    />
  );
}
