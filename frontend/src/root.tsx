import type { Dispatch, SetStateAction } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Activity, BookUser, Calendar, FileText, Home, MessageCircle, Newspaper, Settings, Sparkles, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
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
import { PublicBlogPage } from './private-pages/PublicBlogPage';

export { ROUTES, ROUTE_PATTERNS } from './root.paths';

/** Mapa legível: URL → página (documentação e eventual uso em menus dinâmicos) */
export const PAGE_REGISTRY = [
  { path: ROUTES.landing, title: 'Landing' },
  { path: ROUTES.blog, title: 'Blog' },
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
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }
  return (
    <>
      <AppShellProvider value={shellValue}>
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background lg:bg-gray-50">
          <DesktopSidebar
            userName={profileData.name}
            userEmail={profileData.email}
            isAdmin={userRole === 'admin'}
            onLogout={shellValue.onLogout}
          />
          <main className="min-w-0 flex-1 overflow-hidden lg:p-4 xl:p-6">
            <div className="h-full min-h-0 overflow-hidden bg-background lg:rounded-[28px] lg:border lg:border-gray-200 lg:shadow-xl lg:shadow-gray-900/5">
              <Outlet />
            </div>
          </main>
        </div>
      </AppShellProvider>
      <div className="lg:hidden">
        <SideMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          userName={profileData.name}
          userEmail={profileData.email}
          isAdmin={userRole === 'admin'}
        />
      </div>
    </>
  );
}

function DesktopSidebar({
  userName,
  userEmail,
  isAdmin,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const items = [
    { to: ROUTES.home, label: 'Início', description: 'Visão geral', icon: Home },
    { to: ROUTES.chat, label: 'Chat com Kiki', description: 'Assistente pessoal', icon: MessageCircle },
    { to: ROUTES.calendar, label: 'Calendário', description: 'Agenda e tarefas', icon: Calendar },
    { to: ROUTES.notes, label: 'Notas', description: 'Anotações', icon: FileText },
    { to: ROUTES.contacts, label: 'Contatos', description: 'Pessoas e e-mails', icon: BookUser },
    ...(isAdmin
      ? [
          { to: ROUTES.adminBlog, label: 'Blog', description: 'Posts e publicação', icon: Newspaper },
          { to: ROUTES.adminUsers, label: 'Usuários', description: 'Contas e acessos', icon: Users },
          { to: ROUTES.adminUsage, label: 'Uso', description: 'Métricas da plataforma', icon: Activity },
        ]
      : []),
    { to: ROUTES.settings, label: 'Configurações', description: 'Preferências', icon: Settings },
  ];

  return (
    <aside className="hidden w-[292px] shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-gray-100 px-5 py-6">
        <NavLink to={ROUTES.home} className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/15">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-gray-950">KIKI</p>
            <p className="text-xs text-gray-500">Assistente</p>
          </div>
        </NavLink>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-sm font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">{userName}</p>
              <p className="truncate text-xs text-gray-500">{userEmail}</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                isActive ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/15' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-white/18' : 'bg-gray-100'}`}>
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className={`block truncate text-xs ${isActive ? 'text-white/75' : 'text-gray-500'}`}>{item.description}</span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <button type="button" onClick={onLogout} className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200">
          Sair
        </button>
      </div>
    </aside>
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
      <Route path={ROUTES.blog} element={<PublicBlogPage />} />
      <Route path={ROUTE_PATTERNS.blogPost} element={<PublicBlogPage />} />
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
