import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { IntegrationScreen } from '@/components/IntegrationScreen';
import { ROUTES } from '@/navigation/routes';
import { integrationTypeFromSlug } from '@/navigation/integrations';

export function IntegrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const integrationType = integrationTypeFromSlug(slug);
  if (!integrationType) {
    return <Navigate to={ROUTES.profile} replace />;
  }

  const from = (location.state as { from?: string } | null)?.from ?? ROUTES.profile;

  return (
    <IntegrationScreen
      onNavigateBack={() => navigate(from)}
      integrationType={integrationType}
      integrationSlug={slug!}
    />
  );
}
