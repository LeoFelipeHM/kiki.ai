import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import type { CalendarEvent } from './types/calendar';
import { AuthSessionExpiredError, initializeAuthSession, login, logout } from './services/auth';
import { fetchCalendarEvents } from './services/calendar';
import { fetchSettings } from './services/settings';
import { seedHomeCalendarRange } from './lib/calendarUtils';
import type { AppShellContextValue, ProfileDataState, ThemeAppearance } from './context/AppShellContext';
import { ROUTES } from './root.paths';
import { RootRoutes } from './root';

function AppRoutes() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [userRole, setUserRole] = useState<string>('user');
  const [themeColor, setThemeColor] = useState('from-purple-500 to-pink-500');
  const [appearance, setAppearance] = useState<ThemeAppearance>('light');
  const [profileData, setProfileData] = useState<ProfileDataState>({
    name: 'Maria Silva',
    email: 'maria.silva@email.com',
    phone: '+55 (11) 98765-4321',
    birthdate: '15 de Março, 1995',
    language: 'Português (Brasil)',
    timezone: 'GMT-3 (Brasília)',
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsAuthenticated(false);
    setCurrentUserId('');
    setUserRole('user');
    setIsMenuOpen(false);
    setEvents([]);
    navigate(ROUTES.login, { replace: true });
  }, [navigate]);

  const handleSessionExpired = useCallback(() => {
    setIsAuthenticated(false);
    setEvents([]);
    navigate(ROUTES.login, { replace: true });
  }, [navigate]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const result = await login(email, password);
      if (!result.success || !result.user) return result;

      setProfileData((prev) => ({
        ...prev,
        name: result.user?.name || prev.name,
        email: result.user?.email || prev.email,
      }));
      if (result.user) {
        setCurrentUserId(result.user.id);
        setUserRole(result.user.role);
      }
      navigate(ROUTES.home, { replace: true });
      setIsAuthenticated(true);
      return result;
    },
    [navigate],
  );

  useEffect(() => {
    void (async () => {
      const user = await initializeAuthSession();
      if (user) {
        setProfileData((prev) => ({ ...prev, name: user.name, email: user.email }));
        setCurrentUserId(user.id);
        setUserRole(user.role);
        setIsAuthenticated(true);
      }
      setIsAuthLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setEvents([]);
      return;
    }
    void (async () => {
      const { from, to } = seedHomeCalendarRange();
      try {
        const list = await fetchCalendarEvents(from, to);
        setEvents(list);
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) {
          handleSessionExpired();
        }
      }
    })();
  }, [isAuthenticated, handleSessionExpired]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAppearance('light');
      return;
    }
    void (async () => {
      try {
        const s = await fetchSettings();
        setAppearance(s.ui.theme_mode);
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) {
          handleSessionExpired();
        }
      }
    })();
  }, [isAuthenticated, handleSessionExpired]);

  const shellValue = useMemo(
    (): AppShellContextValue => ({
      profileData,
      setProfileData,
      events,
      setEvents,
      themeColor,
      setThemeColor,
      appearance,
      setAppearance,
      currentUserId,
      userRole,
      openMenu: () => setIsMenuOpen(true),
      onLogout: handleLogout,
      onSessionExpired: handleSessionExpired,
    }),
    [
      profileData,
      events,
      themeColor,
      appearance,
      currentUserId,
      userRole,
      handleLogout,
      handleSessionExpired,
    ],
  );

  return (
    <ThemeProvider themeColor={themeColor} appearance={appearance}>
      <div
        className={`size-full flex flex-col bg-background max-w-md mx-auto ${appearance === 'dark' ? 'dark' : ''}`}
      >
        {isAuthLoading ? (
          <div className="size-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-1 flex-col w-full overflow-hidden">
            <RootRoutes
              isAuthenticated={isAuthenticated}
              handleLogin={handleLogin}
              shellValue={shellValue}
              profileData={profileData}
              userRole={userRole}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
            />
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
