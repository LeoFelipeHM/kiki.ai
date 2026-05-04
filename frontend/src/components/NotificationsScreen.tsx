import { ArrowLeft, Bell, Mail, MessageSquare, Calendar, Smartphone, Volume2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';

interface NotificationsScreenProps {
  onNavigateBack?: () => void;
}

export function NotificationsScreen({ onNavigateBack }: NotificationsScreenProps) {
  const { themeColor } = useTheme();
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
    // Tipos de notificação
    reminders: true,
    meetings: true,
    tasks: true,
    kikiSuggestions: true,
    dailySummary: true,
    weeklyReport: false,
  });

  const [reminderStyle, setReminderStyle] = useState('Amigável');

  const reminderStyles = [
    { name: 'Amigável', description: 'Tom casual e encorajador' },
    { name: 'Profissional', description: 'Comunicação formal e direta' },
    { name: 'Motivacional', description: 'Mensagens energéticas e inspiradoras' },
  ];

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  const notificationChannels = [
    {
      title: 'Canais de Notificação',
      items: [
        { key: 'pushEnabled', icon: Bell, label: 'Notificações push', description: 'Receba alertas no aplicativo' },
        { key: 'emailEnabled', icon: Mail, label: 'E-mail', description: 'Receba resumos por e-mail' },
        { key: 'smsEnabled', icon: MessageSquare, label: 'SMS', description: 'Alertas urgentes por SMS' },
      ],
    },
    {
      title: 'Configurações de Som',
      items: [
        { key: 'soundEnabled', icon: Volume2, label: 'Som', description: 'Tocar som nas notificações' },
        { key: 'vibrationEnabled', icon: Smartphone, label: 'Vibração', description: 'Vibrar ao receber notificações' },
      ],
    },
    {
      title: 'Tipos de Notificação',
      items: [
        { key: 'reminders', icon: Bell, label: 'Lembretes', description: 'Alertas de tarefas e compromissos' },
        { key: 'meetings', icon: Calendar, label: 'Reuniões', description: 'Notificações de reuniões próximas' },
        { key: 'tasks', icon: MessageSquare, label: 'Tarefas', description: 'Atualizações de tarefas' },
        { key: 'kikiSuggestions', icon: Bell, label: 'Sugestões da Kiki', description: 'Dicas e sugestões inteligentes' },
        { key: 'dailySummary', icon: Mail, label: 'Resumo diário', description: 'Receba um resumo do seu dia' },
        { key: 'weeklyReport', icon: Mail, label: 'Relatório semanal', description: 'Análise semanal de produtividade' },
      ],
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-5 pt-8 pb-4 flex-1 overflow-y-auto">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors btn-apple"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar</span>
        </button>

        <div className="mb-8">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center mb-4`}>
            <Bell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie como você recebe alertas e atualizações
          </p>
        </div>

        <div className="space-y-6">
          {notificationChannels.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={`flex items-center gap-3 p-4 ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <button
                      onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications]
                          ? `bg-gradient-to-br ${themeColor}`
                          : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Estilo de Lembretes Section */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Estilo de Lembretes
            </h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Como a Kiki se comunica</p>
                    <p className="text-xs text-muted-foreground">Escolha o tom das mensagens</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {reminderStyles.map((style) => (
                    <button
                      key={style.name}
                      onClick={() => setReminderStyle(style.name)}
                      className={`w-full p-3 rounded-xl border-2 transition-all btn-apple text-left ${
                        reminderStyle === style.name ? `border-purple-500 bg-purple-50` : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            reminderStyle === style.name ? 'border-purple-500' : 'border-gray-300'
                          }`}
                        >
                          {reminderStyle === style.name && <div className="w-3 h-3 rounded-full bg-purple-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm mb-0.5">{style.name}</p>
                          <p className="text-xs text-muted-foreground">{style.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-6">
          <p className="text-xs text-purple-700">
            Dica: Você pode personalizar o horário de "Não perturbe" nas configurações avançadas para silenciar notificações em horários específicos.
          </p>
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={onNavigateBack}
          className={`w-full bg-gradient-to-br ${themeColor} text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
        >
          Salvar preferências
        </button>
      </div>
    </div>
  );
}
