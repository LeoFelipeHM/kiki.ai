import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { useAppShell } from '@/context/AppShellContext';
import { backNavButtonClassName } from '@/lib/backNavButton';
import { AuthSessionExpiredError, changePassword } from '@/services/auth';

interface ChangePasswordScreenProps {
  onNavigateBack?: () => void;
  onSuccess?: () => Promise<void>;
}

export function ChangePasswordScreen({ onNavigateBack, onSuccess }: ChangePasswordScreenProps) {
  const { themeColor } = useTheme();
  const { onSessionExpired } = useAppShell();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRequirements = [
    { text: 'Pelo menos 8 caracteres', met: newPassword.length >= 8 },
    { text: 'Uma letra maiúscula', met: /[A-Z]/.test(newPassword) },
    { text: 'Uma letra minúscula', met: /[a-z]/.test(newPassword) },
    { text: 'Um número', met: /\d/.test(newPassword) },
    { text: 'Um caractere especial', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';
  const canSubmit = allRequirementsMet && passwordsMatch && currentPassword !== '' && !isSubmitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      await onSuccess?.();
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(e instanceof Error ? e.message : 'Não foi possível alterar a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-5 pt-8 pb-4 flex-1 overflow-y-auto">
        <button type="button" onClick={onNavigateBack} className={`${backNavButtonClassName} mb-6`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar</span>
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

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Senha atual</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Digite sua senha atual"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nova senha</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Digite sua nova senha"
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirmar nova senha</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Confirme sua nova senha"
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
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

        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm font-medium mb-3">Sua senha deve conter:</p>
          <div className="space-y-2">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    req.met ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  {req.met && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-xs ${req.met ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-4">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Após alterar sua senha, você será desconectado de todos os dispositivos e precisará fazer login novamente.
          </p>
        </div>
      </div>

      <div className="p-5">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSubmit}
          className={`w-full bg-gradient-to-br ${themeColor} text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSubmitting ? 'Salvando…' : 'Alterar senha'}
        </button>
      </div>
    </div>
  );
}
