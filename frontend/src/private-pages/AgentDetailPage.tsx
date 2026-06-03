import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AgentDetailScreen } from '@/components/AgentDetailScreen';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function AgentDetailPage() {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const { onSessionExpired } = useAppShell();

  if (!agentId) return <Navigate to={ROUTES.agents} replace />;

  return (
    <AgentDetailScreen
      agentId={agentId}
      onNavigateBack={() => navigate(ROUTES.agents)}
      onSessionExpired={onSessionExpired}
    />
  );
}
