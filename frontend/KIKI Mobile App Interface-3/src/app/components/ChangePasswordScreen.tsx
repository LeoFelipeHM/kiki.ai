import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';

interface ChangePasswordScreenProps {
  onNavigateBack?: () => void;
}

export function ChangePasswordScreen({ onNavigateBack }: ChangePasswordScreenProps) {
  const { themeColor } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = [
    { text: 'Pelo menos 8 caracteres', met: newPassword.length >= 8 },
    { text: 'Uma letra maiúscula', met: /[A-Z]/.test(newPassword) },
    { text: 'Uma letra minúscula', met: /[a-z]/.test(newPassword) },
    { text: 'Um número', met: /\d/.test(newPassword) },
    { text: 'Um caractere especial', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';
  const canSubmit = allRequirementsMet && passwordsMatch && currentPassword !== '';

  const handleSave = () => {
    if (canSubmit) {
      // Aqui salvaria a senha
      onNavigateBack?.();
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
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center mb-4`}>
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">Alterar Senha</h1>
          <p className="text-sm text-muted-foreground">
            Mantenha sua conta segura com uma senha forte
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Senha Atual */}
          <div>
            <label className="block text-sm font-medium mb-2">Senha atual</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div>
            <label className="block text-sm font-medium mb-2">Nova senha</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label className="block text-sm font-medium mb-2">Confirmar nova senha</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-2">As senhas não coincidem</p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                As senhas coincidem
              </p>
            )}
          </div>
        </div>

        {/* Requisitos de Senha */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm font-medium mb-3">Sua senha deve conter:</p>
          <div className="space-y-2">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  req.met ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {req.met && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-xs ${req.met ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Após alterar sua senha, você será desconectado de todos os dispositivos e precisará fazer login novamente.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="w-full bg-gradient-to-br ${themeColor} text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Alterar senha
        </button>
      </div>
    </div>
  );
}
