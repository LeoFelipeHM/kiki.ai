import { useNavigate } from 'react-router-dom';
import { DeleteAccountScreen } from '@/components/DeleteAccountScreen';
import { ROUTES } from '@/navigation/routes';

export function DeleteAccountPage() {
  const navigate = useNavigate();

  return (
    <DeleteAccountScreen
      onNavigateBack={() => navigate(ROUTES.profilePrivacy)}
      onManageSubscription={() => navigate(ROUTES.profileSubscription)}
    />
  );
}
