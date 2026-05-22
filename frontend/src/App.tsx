import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import type { CalendarEvent } from './types/calendar';
import { AuthSessionExpiredError, initializeAuthSession, login, logout } from './services/auth';
import { fetchCalendarEvents } from './services/calendar';
import { fetchSettings, type NotificationPreferencesDto } from './services/settings';
import { seedHomeCalendarRange } from './lib/calendarUtils';
import type { AppShellContextValue, ProfileDataState, ThemeAppearance } from './context/AppShellContext';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import {
  ensureServiceWorkerRegistered,
  isWebPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from './lib/pushSubscription';
import { ROUTES } from './root.paths';
import { RootRoutes } from './root';

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const appScrollRef = useRef<HTMLDivElement>(null);
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
    timezone: 'America/Sao_Paulo',
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferencesDto | null>(null);

  useLayoutEffect(() => {
    if (appScrollRef.current) {
      appScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  const handleLogout = useCallback(async () => {
    if (isWebPushSupported()) {
      try {
        await unsubscribeFromPush();
      } catch {
        // ignora — logout não pode quebrar
      }
    }
    await logout();
    setIsAuthenticated(false);
    setCurrentUserId('');
    setUserRole('user');
    setIsMenuOpen(false);
    setEvents([]);
    setNotificationPrefs(null);
    navigate(ROUTES.landing, { replace: true });
  }, [navigate]);

  const handleSessionExpired = useCallback(() => {
    setIsAuthenticated(false);
    setEvents([]);
    setNotificationPrefs(null);
    navigate(ROUTES.landing, { replace: true });
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
      setNotificationPrefs(null);
      return;
    }
    void (async () => {
      try {
        const s = await fetchSettings();
        setAppearance(s.ui.theme_mode);
        setNotificationPrefs(s.notifications);
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) {
          handleSessionExpired();
        }
      }
    })();
  }, [isAuthenticated, handleSessionExpired]);

  const navigateToCalendar = useCallback(() => {
    navigate(ROUTES.calendar);
  }, [navigate]);
  const navigateToHome = useCallback(() => {
    navigate(ROUTES.home);
  }, [navigate]);

  useNotificationScheduler({
    enabled: isAuthenticated,
    events,
    prefs: notificationPrefs,
    onMeetingClick: navigateToCalendar,
    onTaskClick: navigateToCalendar,
    onSummaryClick: navigateToHome,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isWebPushSupported()) return;
    void ensureServiceWorkerRegistered().catch(() => undefined);
    if (!notificationPrefs?.push_enabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    void subscribeToPush().catch(() => undefined);
  }, [isAuthenticated, notificationPrefs?.push_enabled]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (!data) return;
      if (data.type === 'kiki:notification-click' && typeof data.url === 'string') {
        try {
          navigate(data.url);
        } catch {
          // ignora rotas inválidas
        }
      }
      if (data.type === 'kiki:push-subscription-change') {
        void subscribeToPush().catch(() => undefined);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  const isPublicFullWidthLanding =
    !isAuthLoading && !isAuthenticated && location.pathname === ROUTES.landing;

  /** Marketing do bundle é sempre light; evita tokens dark na landing pública. */
  const shellIsDark = appearance === 'dark' && !isPublicFullWidthLanding;

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
      notificationPrefs,
      setNotificationPrefs,
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
      notificationPrefs,
    ],
  );

  return (
    <ThemeProvider themeColor={themeColor} appearance={appearance}>
      <div
        className={`size-full flex flex-col bg-background ${isPublicFullWidthLanding ? 'w-full' : 'max-w-md mx-auto'} ${shellIsDark ? 'dark' : ''}`}
      >
        {isAuthLoading ? (
          <div className="size-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
          </div>
        ) : (
          <div
            ref={appScrollRef}
            data-app-scroll-container="true"
            className={`flex h-full min-h-0 flex-1 flex-col w-full ${
              isPublicFullWidthLanding ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
            }`}
          >
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
