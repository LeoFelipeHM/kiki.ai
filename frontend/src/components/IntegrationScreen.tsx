import { ArrowLeft, Calendar, Mail, Clock, Link2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface IntegrationScreenProps {
  onNavigateBack?: () => void;
  integrationType: string;
}

export function IntegrationScreen({ onNavigateBack, integrationType }: IntegrationScreenProps) {
  const [isConnected, setIsConnected] = useState(
    integrationType === 'Google Calendar' || integrationType === 'Gmail'
  );

  const integrationDetails: { [key: string]: any } = {
    'Google Calendar': {
      icon: Calendar,
      name: 'Google Calendar',
      description: 'Sincronize seus eventos e compromissos automaticamente',
      color: 'from-blue-500 to-blue-600',
      features: [
        'Sincronização bidirecional de eventos',
        'Notificações integradas',
        'Criação automática de lembretes',
        'Sugestões inteligentes de horários',
      ],
      permissions: [
        'Ler eventos do calendário',
        'Criar e editar eventos',
        'Receber notificações de eventos',
      ],
    },
    'Gmail': {
      icon: Mail,
      name: 'Gmail',
      description: 'Acesse e gerencie seus e-mails diretamente na Kiki',
      color: 'from-red-500 to-red-600',
      features: [
        'Leitura de e-mails importantes',
        'Criação automática de tarefas',
        'Resumos inteligentes',
        'Resposta rápida sugerida',
      ],
      permissions: [
        'Ler e-mails',
        'Enviar e-mails em seu nome',
        'Gerenciar etiquetas',
      ],
    },
    'Outlook': {
      icon: Mail,
      name: 'Outlook',
      description: 'Integre sua conta Microsoft Outlook',
      color: 'from-blue-600 to-blue-700',
      features: [
        'Sincronização de e-mails',
        'Calendário Outlook integrado',
        'Contatos sincronizados',
        'Lembretes de reuniões',
      ],
      permissions: [
        'Acessar e-mails e calendário',
        'Enviar e-mails',
        'Gerenciar eventos',
      ],
    },
    'Apple Watch': {
      icon: Clock,
      name: 'Apple Watch',
      description: 'Receba notificações e gerencie tarefas no seu pulso',
      color: 'from-gray-700 to-gray-900',
      features: [
        'Notificações no pulso',
        'Comandos de voz',
        'Lembretes rápidos',
        'Acompanhamento de metas',
      ],
      permissions: [
        'Enviar notificações',
        'Acessar dados de saúde (opcional)',
        'Usar microfone',
      ],
    },
  };

  const details = integrationDetails[integrationType];
  const Icon = details.icon;

  const handleToggleConnection = () => {
    if (isConnected) {
      // Desconectar
      setIsConnected(false);
    } else {
      // Conectar
      setIsConnected(true);
    }
  };

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
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${details.color} flex items-center justify-center mb-4 shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">{details.name}</h1>
          <p className="text-sm text-muted-foreground">
            {details.description}
          </p>
        </div>

        {/* Status */}
        <div className={`mb-6 p-4 rounded-2xl ${
          isConnected ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-amber-600" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${isConnected ? 'text-green-900' : 'text-amber-900'}`}>
                {isConnected ? 'Conectado' : 'Não conectado'}
              </p>
              <p className={`text-xs ${isConnected ? 'text-green-700' : 'text-amber-700'}`}>
                {isConnected ? 'Sincronizando dados automaticamente' : 'Clique em conectar para ativar'}
              </p>
            </div>
          </div>
        </div>

        {/* Recursos */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Recursos Disponíveis
          </h3>
          <div className="bg-card border border-border rounded-2xl p-4">
            <ul className="space-y-3">
              {details.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Permissões */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Permissões Necessárias
          </h3>
          <div className="bg-card border border-border rounded-2xl p-4">
            <ul className="space-y-2">
              {details.permissions.map((permission: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{permission}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-700">
            Sua privacidade é importante. Usamos criptografia de ponta a ponta e nunca compartilhamos seus dados com terceiros.
          </p>
        </div>
      </div>

      <div className="p-5">
        {isConnected ? (
          <button
            onClick={handleToggleConnection}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-full font-semibold btn-apple transition-all"
          >
            Desconectar {details.name}
          </button>
        ) : (
          <button
            onClick={handleToggleConnection}
            className="w-full bg-gradient-to-br from-purple-500 to-pink-500 text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Link2 className="w-5 h-5" />
            Conectar {details.name}
          </button>
        )}
      </div>
    </div>
  );
}
