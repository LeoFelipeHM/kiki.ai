import { useNavigate } from 'react-router-dom';
import { ManageSubscriptionScreen } from '@/components/ManageSubscriptionScreen';
import { ROUTES } from '@/navigation/routes';

export function ManageSubscriptionPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <ManageSubscriptionScreen onNavigateBack={() => navigate(ROUTES.profile)} />
    </div>
  );
}
