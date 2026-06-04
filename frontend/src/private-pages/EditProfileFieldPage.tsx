import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { EditProfileField } from '@/components/EditProfileField';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';
import { profileFieldLabelFromSlug } from '@/navigation/profileFields';
import { AuthSessionExpiredError, updateProfile } from '@/services/auth';

export function EditProfileFieldPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { profileData, setProfileData, onSessionExpired } = useAppShell();

  const fieldLabel = profileFieldLabelFromSlug(slug);
  if (!fieldLabel) {
    return <Navigate to={ROUTES.profile} replace />;
  }

  const fieldMap: { [key: string]: keyof typeof profileData } = {
    'Nome completo': 'name',
    Nickname: 'nickname',
    'E-mail': 'email',
    Telefone: 'phone',
    'Data de nascimento': 'birthdate',
    Idioma: 'language',
    'Fuso horário': 'timezone',
  };

  const dataKey = fieldMap[fieldLabel];
  const rawValue = dataKey ? profileData[dataKey] : '';
  const currentValue =
    fieldLabel === 'Nickname' ? String(rawValue).replace(/^@/, '') : String(rawValue);

  const handleSave = async (value: string) => {
    if (fieldLabel === 'Nome completo') {
      const user = await updateProfile({ name: value.trim() });
      setProfileData((prev) => ({
        ...prev,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
      }));
      return;
    }
    if (fieldLabel === 'Nickname') {
      const user = await updateProfile({ nickname: value.trim().replace(/^@/, '') });
      setProfileData((prev) => ({
        ...prev,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
      }));
      return;
    }
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
      onSessionExpired={onSessionExpired}
    />
  );
}
