import { useNavigate } from 'react-router-dom';
import { EditProfilePhoto } from '@/components/EditProfilePhoto';
import { useAppShell } from '@/context/AppShellContext';
import { ROUTES } from '@/navigation/routes';

export function EditProfilePhotoPage() {
  const navigate = useNavigate();
  const { profileData, themeColor, setThemeColor } = useAppShell();

  return (
    <EditProfilePhoto
      onNavigateBack={() => navigate(ROUTES.profile)}
      onSaveColor={(color) => setThemeColor(color)}
      currentColor={themeColor}
      userName={profileData.name}
    />
  );
}
