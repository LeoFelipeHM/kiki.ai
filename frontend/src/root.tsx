import type { Dispatch, SetStateAction } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { SideMenu } from './components/SideMenu';
import { LoginScreen } from './components/LoginScreen';
import type { LoginResult } from './services/auth';
import type { AppShellContextValue, ProfileDataState } from './context/AppShellContext';
import { AppShellProvider } from './context/AppShellContext';
import { ROUTES, ROUTE_PATTERNS } from './root.paths';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { CalendarPage } from './pages/CalendarPage';
import { NotesPage } from './pages/NotesPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfileFieldPage } from './pages/EditProfileFieldPage';
import { EditProfilePhotoPage } from './pages/EditProfilePhotoPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { ManageSubscriptionPage } from './pages/ManageSubscriptionPage';
import { IntegrationPage } from './pages/IntegrationPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { SettingsPage } from './pages/SettingsPage';

export { ROUTES, ROUTE_PATTERNS } from './root.paths';

/** Mapa legível: URL → página (documentação e eventual uso em menus dinâmicos) */
export const PAGE_REGISTRY = [
  { path: ROUTES.login, title: 'Login' },
  { path: '/', title: 'Raiz (redireciona)' },
  { path: ROUTES.home, title: 'Início' },
  { path: ROUTES.chat, title: 'Chat com Kiki' },
  { path: ROUTES.calendar, title: 'Calendário' },
  { path: ROUTES.notes, title: 'Notas' },
  { path: ROUTES.settings, title: 'Configurações' },
  { path: ROUTES.profile, title: 'Perfil' },
  { path: ROUTES.profilePhoto, title: 'Foto do perfil' },
  { path: ROUTE_PATTERNS.profileEdit, title: 'Editar campo do perfil' },
  { path: ROUTES.profilePassword, title: 'Alterar senha' },
  { path: ROUTES.profileNotifications, title: 'Notificações' },
  { path: ROUTES.profilePrivacy, title: 'Privacidade' },
  { path: ROUTES.profileDeleteAccount, title: 'Excluir conta' },
  { path: ROUTES.profileSubscription, title: 'Assinatura' },
  { path: ROUTE_PATTERNS.integration, title: 'Integração' },
  { path: ROUTES.adminUsers, title: 'Administração de usuários' },
] as const;

export function ProtectedLayout({
  isAuthenticated,
  shellValue,
  profileData,
  userRole,
  isMenuOpen,
  setIsMenuOpen,
}: {
  isAuthenticated: boolean;
  shellValue: AppShellContextValue;
  profileData: ProfileDataState;
  userRole: string;
  isMenuOpen: boolean;
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>;
}) {
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }
  return (
    <>
      <AppShellProvider value={shellValue}>
        <Outlet />
      </AppShellProvider>
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        userName={profileData.name}
        userEmail={profileData.email}
        isAdmin={userRole === 'admin'}
      />
    </>
  );
}

export type RootRoutesProps = {
  isAuthenticated: boolean;
  handleLogin: (email: string, password: string) => Promise<LoginResult>;
  shellValue: AppShellContextValue;
  profileData: ProfileDataState;
  userRole: string;
  isMenuOpen: boolean;
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>;
};

export function RootRoutes({
  isAuthenticated,
  handleLogin,
  shellValue,
  profileData,
  userRole,
  isMenuOpen,
  setIsMenuOpen,
}: RootRoutesProps) {
  return (
    <Routes>
      <Route
        path={ROUTES.login}
        element={
          isAuthenticated ? (
            <Navigate to={ROUTES.home} replace />
          ) : (
            <LoginScreen onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? ROUTES.home : ROUTES.login} replace />}
      />
      <Route
        element={
          <ProtectedLayout
            isAuthenticated={isAuthenticated}
            shellValue={shellValue}
            profileData={profileData}
            userRole={userRole}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
          />
        }
      >
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.chat} element={<ChatPage />} />
        <Route path={ROUTES.calendar} element={<CalendarPage />} />
        <Route path={ROUTES.notes} element={<NotesPage />} />
        <Route path={ROUTES.settings} element={<SettingsPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.profilePhoto} element={<EditProfilePhotoPage />} />
        <Route path={ROUTE_PATTERNS.profileEdit} element={<EditProfileFieldPage />} />
        <Route path={ROUTES.profilePassword} element={<ChangePasswordPage />} />
        <Route path={ROUTES.profileNotifications} element={<NotificationsPage />} />
        <Route path={ROUTES.profilePrivacy} element={<PrivacyPage />} />
        <Route path={ROUTES.profileDeleteAccount} element={<DeleteAccountPage />} />
        <Route path={ROUTES.profileSubscription} element={<ManageSubscriptionPage />} />
        <Route path={ROUTE_PATTERNS.integration} element={<IntegrationPage />} />
        <Route path={ROUTES.adminUsers} element={<AdminUsersPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? ROUTES.home : ROUTES.login} replace />}
      />
    </Routes>
  );
}
