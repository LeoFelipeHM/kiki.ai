import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { EditProfileField } from '@/components/EditProfileField';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';
import { profileFieldLabelFromSlug } from '@/navigation/profileFields';

export function EditProfileFieldPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profileData, setProfileData } = useAppShell();

  const fieldLabel = profileFieldLabelFromSlug(slug);
  if (!fieldLabel) {
    return <Navigate to={ROUTES.profile} replace />;
  }

  const fieldMap: { [key: string]: keyof typeof profileData } = {
    'Nome completo': 'name',
    'E-mail': 'email',
    Telefone: 'phone',
    'Data de nascimento': 'birthdate',
    Idioma: 'language',
    'Fuso horário': 'timezone',
  };

  const dataKey = fieldMap[fieldLabel];
  const currentValue = dataKey ? profileData[dataKey] : '';

  const handleSave = (value: string) => {
    if (dataKey) {
      setProfileData((prev) => ({ ...prev, [dataKey]: value }));
    }
  };

  return (
    <EditProfileField
      field={fieldLabel}
      currentValue={currentValue}
      onNavigateBack={() => navigate(ROUTES.profile)}
      onSave={handleSave}
    />
  );
}
