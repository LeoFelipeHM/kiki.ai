import { createContext, useContext } from 'react';
import type { CalendarEvent } from '@/types/calendar';
import type { NotificationPreferencesDto } from '@/services/settings';

export type ProfileDataState = {
  name: string;
  email: string;
  nickname: string;
  phone: string;
  birthdate: string;
  language: string;
  timezone: string;
};

export type ThemeAppearance = 'light' | 'dark';

export type AppShellContextValue = {
  profileData: ProfileDataState;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileDataState>>;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  themeColor: string;
  setThemeColor: (color: string) => void;
  appearance: ThemeAppearance;
  setAppearance: (appearance: ThemeAppearance) => void;
  currentUserId: string;
  userRole: string;
  openMenu: () => void;
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
  notificationPrefs: NotificationPreferencesDto | null;
  setNotificationPrefs: React.Dispatch<
    React.SetStateAction<NotificationPreferencesDto | null>
  >;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({
  value,
  children,
}: {
  value: AppShellContextValue;
  children: React.ReactNode;
}) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell deve ser usado dentro de AppShellProvider');
  return ctx;
}
