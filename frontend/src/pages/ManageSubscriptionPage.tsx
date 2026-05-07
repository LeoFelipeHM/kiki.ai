import { useNavigate } from 'react-router-dom';
import { ManageSubscriptionScreen } from '@/components/ManageSubscriptionScreen';
import { ROUTES } from '@/navigation/routes';

export function ManageSubscriptionPage() {
  const navigate = useNavigate();

  return <ManageSubscriptionScreen onNavigateBack={() => navigate(ROUTES.profile)} />;
}
