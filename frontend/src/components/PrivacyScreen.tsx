import { ArrowLeft, Shield, Eye, Lock, Database, Trash2, ChevronRight } from 'lucide-react';
import { backNavButtonClassName } from '@/lib/backNavButton';
import { useState } from 'react';

interface PrivacyScreenProps {
  onNavigateBack?: () => void;
  onDeleteAccount?: () => void;
}

export function PrivacyScreen({ onNavigateBack, onDeleteAccount }: PrivacyScreenProps) {
  const [privacy, setPrivacy] = useState({
    dataCollection: true,
    personalization: true,
    shareAnalytics: false,
    twoFactorAuth: false,
  });

  const togglePrivacy = (key: keyof typeof privacy) => {
    if (typeof privacy[key] === 'boolean') {
      setPrivacy({ ...privacy, [key]: !privacy[key] });
    }
  };

  const privacySections = [
    {
      title: 'Configurações de Privacidade',
      items: [
        {
          key: 'dataCollection',
          icon: Database,
          label: 'Coleta de dados',
          description: 'Permitir coleta de dados para melhorar o serviço',
          toggle: true,
        },
        {
          key: 'personalization',
          icon: Eye,
          label: 'Personalização',
          description: 'Usar seus dados para personalizar sugestões',
          toggle: true,
        },
        {
          key: 'shareAnalytics',
          icon: Database,
          label: 'Compartilhar análises',
          description: 'Compartilhar dados anônimos para pesquisa',
          toggle: true,
        },
      ],
    },
    {
      title: 'Segurança Adicional',
      items: [
        {
          key: 'twoFactorAuth',
          icon: Lock,
          label: 'Autenticação de dois fatores',
          description: '2FA desativado - Configure para mais segurança',
          toggle: true,
        },
      ],
    },
    {
      title: 'Seus Dados',
      items: [
        {
          key: 'delete',
          icon: Trash2,
          label: 'Excluir conta',
          description: 'Remover permanentemente sua conta e dados',
          toggle: false,
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-5 pt-8 pb-4 flex-1 overflow-y-auto">
        <button type="button" onClick={onNavigateBack} className={`${backNavButtonClassName} mb-6`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar</span>
        </button>

        <div className="mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl mb-2">Privacidade</h1>
          <p className="text-sm text-muted-foreground">
            Controle como seus dados são usados e compartilhados
          </p>
        </div>

        {/* Seções de Privacidade */}
        <div className="space-y-6">
          {privacySections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {section.title}
              </h3>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => {
                      if (item.toggle) {
                        togglePrivacy(item.key as keyof typeof privacy);
                      } else if (item.key === 'delete') {
                        onDeleteAccount?.();
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-muted btn-apple ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.danger ? 'bg-red-100' : 'bg-muted'
                    }`}>
                      <item.icon className={`w-5 h-5 ${item.danger ? 'text-red-600' : 'text-foreground'}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-medium ${item.danger ? 'text-red-600' : ''}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    {item.toggle ? (
                      <div
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          privacy[item.key as keyof typeof privacy]
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                            privacy[item.key as keyof typeof privacy]
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
          <p className="text-xs text-green-800 font-medium mb-1">Seus dados estão seguros</p>
          <p className="text-xs text-green-700">
            Usamos criptografia de ponta a ponta para proteger suas informações. Seus dados nunca são vendidos a terceiros.
          </p>
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={onNavigateBack}
          className="w-full bg-gradient-to-br from-purple-500 to-pink-500 text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all"
        >
          Salvar configurações
        </button>
      </div>
    </div>
  );
}
