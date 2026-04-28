import {
  User,
  Bell,
  Moon,
  Lock,
  Calendar as CalendarIcon,
  Volume2,
  ChevronRight,
  LogOut,
} from 'lucide-react';

import { AnimatedIcon } from "@/components/motion/AnimatedIcon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SettingsScreen() {
  const settingsSections = [
    {
      title: 'Conta',
      items: [
        { icon: User, label: 'Perfil do usuário', value: 'Maria Silva' },
        { icon: Lock, label: 'Segurança e privacidade' },
      ],
    },
    {
      title: 'Preferências',
      items: [
        { icon: Bell, label: 'Notificações', value: 'Ativadas' },
        { icon: Moon, label: 'Tema', value: 'Claro' },
        { icon: Volume2, label: 'Voz da assistente', value: 'Feminina' },
      ],
    },
    {
      title: 'Integrações',
      items: [
        { icon: CalendarIcon, label: 'Google Calendar', value: 'Conectado' },
        { icon: CalendarIcon, label: 'Outlook', value: 'Não conectado' },
      ],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-6 pt-12 pb-6">
        <h1 className="mb-8">Configurações</h1>

        <div className="mb-8">
          <Card className="flex items-center gap-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white border-0 shadow-md">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl">
              M
            </div>
            <div className="flex-1">
              <h2 className="mb-1 text-white">Maria Silva</h2>
              <p className="text-white/80">maria.silva@email.com</p>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {settingsSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="mb-3 text-muted-foreground">{section.title}</h3>
              <Card className="rounded-2xl overflow-hidden">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    className={`group w-full flex items-center gap-4 p-4 hover:bg-muted transition-[background-color,transform] duration-200 ease-out active:scale-[0.995] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 ${
                      itemIndex !== section.items.length - 1
                        ? 'border-b border-border'
                        : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <AnimatedIcon>
                        <item.icon className="w-5 h-5 text-foreground transition-[transform,opacity] duration-200 group-hover:opacity-90" />
                      </AnimatedIcon>
                    </div>
                    <div className="flex-1 text-left">
                      <p>{item.label}</p>
                      {item.value && (
                        <p className="text-sm text-muted-foreground">{item.value}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </Card>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button variant="destructive" className="w-full rounded-2xl h-12">
            <LogOut className="w-5 h-5" />
            <span>Sair da conta</span>
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">KIKI Assistente v1.0.0</p>
          <p className="text-xs text-muted-foreground">
            © 2026 KIKI. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
