import { ArrowLeft, Calendar, Mail, Clock, Link2, CheckCircle, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAppShell } from '@/context/AppShellContext';
import { integrationProviderFromSlug } from '@/navigation/integrations';
import { backNavButtonClassName } from '@/lib/backNavButton';
import {
  AuthSessionExpiredError,
  fetchSettings,
  patchIntegration,
} from '@/services/settings';

interface IntegrationScreenProps {
  onNavigateBack?: () => void;
  integrationType: string;
  integrationSlug: string;
}

export function IntegrationScreen({
  onNavigateBack,
  integrationType,
  integrationSlug,
}: IntegrationScreenProps) {
  const { onSessionExpired } = useAppShell();
  const provider = integrationProviderFromSlug(integrationSlug);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!provider) return;
    setError(null);
    setIsLoading(true);
    try {
      const data = await fetchSettings();
      const row = data.integrations.find((i) => i.provider === provider);
      setIsConnected(row?.status === 'connected');
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o status.');
    } finally {
      setIsLoading(false);
    }
  }, [provider, onSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  const integrationDetails: { [key: string]: { icon: typeof Calendar; name: string; description: string; color: string; features: string[]; permissions: string[] } } = {
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
    Gmail: {
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
      permissions: ['Ler e-mails', 'Enviar e-mails em seu nome', 'Gerenciar etiquetas'],
    },
    Outlook: {
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
      permissions: ['Acessar e-mails e calendário', 'Enviar e-mails', 'Gerenciar eventos'],
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
  if (!details || !provider) {
    return null;
  }
  const Icon = details.icon;

  const handleToggleConnection = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const next = !isConnected;
      await patchIntegration(provider, next ? 'connected' : 'disconnected');
      setIsConnected(next);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar a integração.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-5 pt-8 pb-4 flex-1 overflow-y-auto">
        <button type="button" onClick={onNavigateBack} className={`${backNavButtonClassName} mb-6`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar</span>
        </button>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
            <button type="button" className="ml-2 underline btn-apple" onClick={() => void load()}>
              Tentar novamente
            </button>
          </div>
        )}
        {isLoading && <p className="text-sm text-muted-foreground mb-4">Carregando…</p>}

        <div className="mb-8">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${details.color} flex items-center justify-center mb-4 shadow-lg`}
          >
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">{details.name}</h1>
          <p className="text-sm text-muted-foreground">{details.description}</p>
        </div>

        <div
          className={`mb-6 p-4 rounded-2xl ${
            isConnected ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-amber-600" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${isConnected ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'}`}
              >
                {isConnected ? 'Conectado' : 'Não conectado'}
              </p>
              <p
                className={`text-xs ${isConnected ? 'text-green-700 dark:text-green-200/90' : 'text-amber-700 dark:text-amber-200/90'}`}
              >
                {isConnected ? 'Sincronização registrada no servidor (sem OAuth neste MVP)' : 'Clique em conectar para ativar'}
              </p>
            </div>
          </div>
        </div>

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

        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <p className="text-xs text-purple-700 dark:text-purple-200">
            Sua privacidade é importante. Usamos criptografia de ponta a ponta e nunca compartilhamos seus dados com terceiros.
          </p>
        </div>
      </div>

      <div className="p-5">
        {isConnected ? (
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={() => void handleToggleConnection()}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-full font-semibold btn-apple transition-all disabled:opacity-50"
          >
            Desconectar {details.name}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={() => void handleToggleConnection()}
            className="w-full bg-gradient-to-br from-purple-500 to-pink-500 text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Link2 className="w-5 h-5" />
            Conectar {details.name}
          </button>
        )}
      </div>
    </div>
  );
}
