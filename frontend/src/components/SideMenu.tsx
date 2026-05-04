import { Calendar, MessageCircle, X, Settings, Sparkles, Home, FileText } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: 'home' | 'chat' | 'calendar' | 'profile' | 'settings' | 'notes') => void;
  currentScreen: string;
  userName?: string;
  userEmail?: string;
}

export function SideMenu({ isOpen, onClose, onNavigate, currentScreen, userName = 'Maria Silva', userEmail = 'maria.silva@email.com' }: SideMenuProps) {
  const { themeColor } = useTheme();
  const menuItems = [
    { id: 'home' as const, icon: Home, label: 'Início', description: 'Página inicial' },
    { id: 'calendar' as const, icon: Calendar, label: 'Calendário', description: 'Visualize sua agenda' },
    { id: 'notes' as const, icon: FileText, label: 'Notas', description: 'Suas anotações' },
    { id: 'chat' as const, icon: MessageCircle, label: 'Chat com Kiki', description: 'Converse com sua assistente' },
    { id: 'settings' as const, icon: Settings, label: 'Configurações', description: 'Ajustes do app' },
  ];

  const handleNavigate = (screen: 'home' | 'chat' | 'calendar' | 'profile' | 'settings' | 'notes') => {
    onNavigate(screen);
    onClose();
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
                const isActive = currentScreen === item.id || (item.id === 'settings' && currentScreen === 'profile');
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
