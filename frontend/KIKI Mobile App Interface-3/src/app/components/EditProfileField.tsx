import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';

interface EditProfileFieldProps {
  field: string;
  currentValue: string;
  onNavigateBack?: () => void;
  onSave?: (value: string) => void;
}

export function EditProfileField({ field, currentValue, onNavigateBack, onSave }: EditProfileFieldProps) {
  const [value, setValue] = useState(currentValue);

  const handleSave = () => {
    onSave?.(value);
    onNavigateBack?.();
  };

  const getInputType = () => {
    if (field === 'E-mail') return 'email';
    if (field === 'Telefone') return 'tel';
    if (field === 'Data de nascimento') return 'date';
    return 'text';
  };

  const getPlaceholder = () => {
    switch (field) {
      case 'Nome completo':
        return 'Digite seu nome completo';
      case 'E-mail':
        return 'exemplo@email.com';
      case 'Telefone':
        return '+55 (11) 98765-4321';
      case 'Data de nascimento':
        return 'DD/MM/AAAA';
      case 'Idioma':
        return 'Selecione o idioma';
      case 'Fuso horário':
        return 'Selecione o fuso horário';
      default:
        return 'Digite o valor';
    }
  };

  const isSelectField = field === 'Idioma' || field === 'Fuso horário';

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

        <h1 className="text-2xl mb-2">Editar {field}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Atualize suas informações pessoais
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{field}</label>
            {isSelectField ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {field === 'Idioma' ? (
                  <>
                    <option value="Português (Brasil)">Português (Brasil)</option>
                    <option value="English (US)">English (US)</option>
                    <option value="Español">Español</option>
                    <option value="Français">Français</option>
                  </>
                ) : (
                  <>
                    <option value="GMT-3 (Brasília)">GMT-3 (Brasília)</option>
                    <option value="GMT-5 (New York)">GMT-5 (New York)</option>
                    <option value="GMT+0 (London)">GMT+0 (London)</option>
                    <option value="GMT+1 (Paris)">GMT+1 (Paris)</option>
                  </>
                )}
              </select>
            ) : (
              <input
                type={getInputType()}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-br from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 btn-apple-gradient shadow-md hover:shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            Salvar alterações
          </button>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-700">
              {field === 'Nome completo' && 'Certifique-se de usar seu nome real para uma experiência personalizada'}
              {field === 'E-mail' && 'Usaremos este e-mail para notificações importantes'}
              {field === 'Telefone' && 'Pode ser usado para autenticação e recuperação de conta'}
              {field === 'Data de nascimento' && 'Ajuda a Kiki a enviar lembretes e mensagens especiais'}
              {field === 'Idioma' && 'Define o idioma da interface e das respostas da Kiki'}
              {field === 'Fuso horário' && 'Importante para agendar compromissos e lembretes'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
