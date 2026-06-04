import {
  Activity,
  Bot,
  Calendar,
  MessageCircle,
  X,
  Settings,
  Sparkles,
  Home,
  FileText,
  Users,
  Newspaper,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { ROUTES } from '@/navigation/routes';

type MenuScreen =
  | 'home'
  | 'chat'
  | 'agents'
  | 'calendar'
  | 'profile'
  | 'settings'
  | 'notes'
  | 'contacts'
  | 'admin-blog'
  | 'admin-users'
  | 'admin-usage';

const MENU_PATHS: Record<MenuScreen, string> = {
  home: ROUTES.home,
  calendar: ROUTES.calendar,
  notes: ROUTES.notes,
  contacts: ROUTES.contacts,
  chat: ROUTES.chat,
  agents: ROUTES.agents,
  profile: ROUTES.profile,
  settings: ROUTES.settings,
  'admin-blog': ROUTES.adminBlog,
  'admin-users': ROUTES.adminUsers,
  'admin-usage': ROUTES.adminUsage,
};

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  isAdmin?: boolean;
}

export function SideMenu({
  isOpen,
  onClose,
  userName = 'Maria Silva',
  userEmail = 'maria.silva@email.com',
  isAdmin = false,
}: SideMenuProps) {
  const { themeColor } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const menuItems: { id: MenuScreen; icon: typeof Home; label: string; description: string }[] = [
    { id: 'home', icon: Home, label: 'Início', description: 'Página inicial' },
    { id: 'chat', icon: MessageCircle, label: 'Chat com Kiki', description: 'Converse com sua assistente' },
    { id: 'agents', icon: Bot, label: 'Agentes', description: 'Assistentes autônomos' },
    { id: 'calendar', icon: Calendar, label: 'Calendário', description: 'Visualize sua agenda' },
    { id: 'notes', icon: FileText, label: 'Notas', description: 'Suas anotações' },
    { id: 'contacts', icon: Users, label: 'Amigos', description: 'Adicionar e gerenciar amigos' },
    ...(isAdmin
      ? [
          { id: 'admin-blog' as const, icon: Newspaper, label: 'Blog', description: 'Editar e publicar posts' },
          { id: 'admin-users' as const, icon: Users, label: 'Usuários', description: 'Administrar contas' },
          { id: 'admin-usage' as const, icon: Activity, label: 'Uso', description: 'Métricas da plataforma' },
        ]
      : []),
    { id: 'settings', icon: Settings, label: 'Configurações', description: 'Ajustes do app' },
  ];

  const handleNavigate = (screen: MenuScreen) => {
    const base = MENU_PATHS[screen];
    if (screen === 'calendar') {
      navigate(`${ROUTES.calendar}?view=week`);
    } else {
      navigate(base);
    }
    onClose();
  };

  const isPathActive = (itemId: MenuScreen) => {
    if (itemId === 'settings') {
      return pathname === ROUTES.settings;
    }
    if (itemId === 'calendar') {
      return pathname === ROUTES.calendar;
    }
    if (itemId === 'agents') {
      return pathname === ROUTES.agents || pathname.startsWith(`${ROUTES.agents}/`);
    }
    return pathname === MENU_PATHS[itemId];
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-[65%] max-w-[250px] bg-background border-r border-border z-50 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 pt-8 pb-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handleNavigate('home')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center`}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-semibold">KIKI</h2>
                  <p className="text-[10px] text-muted-foreground">Assistente</p>
                </div>
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center btn-apple"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br ${themeColor.replace('from-', 'from-').replace(' to-', '/10 to-')}/10 border border-${themeColor.split(' ')[0].replace('from-', '')}/20`}>
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-xs text-white`}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {menuItems.map((item) => {
                const isActive = isPathActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-all btn-apple ${
                      isActive
                        ? `bg-gradient-to-br ${themeColor} text-white`
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-white/20' : 'bg-muted'
                    }`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className={`text-[10px] truncate ${
                      isActive ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                </button>
              );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-center text-muted-foreground">
              KIKI v1.0.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
