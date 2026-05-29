import type { Dispatch, SetStateAction } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { SideMenu } from './components/SideMenu';
import { LoginScreen } from './components/LoginScreen';
import type { LoginResult } from './services/auth';
import type { AppShellContextValue, ProfileDataState } from './context/AppShellContext';
import { AppShellProvider } from './context/AppShellContext';
import { ROUTES, ROUTE_PATTERNS } from './root.paths';
import { HomePage } from './private-pages/HomePage';
import { ChatPage } from './private-pages/ChatPage';
import { CalendarPage } from './private-pages/CalendarPage';
import { NotesPage } from './private-pages/NotesPage';
import { ContactsPage } from './private-pages/ContactsPage';
import { ProfilePage } from './private-pages/ProfilePage';
import { EditProfileFieldPage } from './private-pages/EditProfileFieldPage';
import { EditProfilePhotoPage } from './private-pages/EditProfilePhotoPage';
import { ChangePasswordPage } from './private-pages/ChangePasswordPage';
import { NotificationsPage } from './private-pages/NotificationsPage';
import { PrivacyPage } from './private-pages/PrivacyPage';
import { DeleteAccountPage } from './private-pages/DeleteAccountPage';
import { ManageSubscriptionPage } from './private-pages/ManageSubscriptionPage';
import { IntegrationPage } from './private-pages/IntegrationPage';
import { AdminUsersPage } from './private-pages/AdminUsersPage';
import { AdminUsagePage } from './private-pages/AdminUsagePage';
import { AdminBlogPage } from './private-pages/AdminBlogPage';
import { SettingsPage } from './private-pages/SettingsPage';
import { PublicLandingPage } from './private-pages/PublicLandingPage';

export { ROUTES, ROUTE_PATTERNS } from './root.paths';

/** Mapa legível: URL → página (documentação e eventual uso em menus dinâmicos) */
export const PAGE_REGISTRY = [
  { path: ROUTES.landing, title: 'Landing' },
  { path: ROUTES.login, title: 'Login' },
  { path: ROUTES.home, title: 'Início' },
  { path: ROUTES.chat, title: 'Chat com Kiki' },
  { path: ROUTES.calendar, title: 'Calendário' },
  { path: ROUTES.notes, title: 'Notas' },
  { path: ROUTES.contacts, title: 'Contatos' },
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
  { path: ROUTES.adminUsage, title: 'Uso da plataforma' },
  { path: ROUTES.adminBlog, title: 'Administração do blog' },
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
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  return (
    <>
      <AppShellProvider value={shellValue}>
        <div className="flex h-full min-h-0 flex-1 flex-col w-full overflow-hidden">
          <Outlet />
        </div>
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
        path={ROUTES.landing}
        element={
          isAuthenticated ? <Navigate to={ROUTES.home} replace /> : <PublicLandingPage />
        }
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
        <Route path={ROUTES.contacts} element={<ContactsPage />} />
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
        <Route path={ROUTES.adminUsage} element={<AdminUsagePage />} />
        <Route path={ROUTES.adminBlog} element={<AdminBlogPage />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? ROUTES.home : ROUTES.landing} replace />}
      />
    </Routes>
  );
}
