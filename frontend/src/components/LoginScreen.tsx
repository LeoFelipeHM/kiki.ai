import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { LoginResult } from '@/services/auth';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<LoginResult>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await onLogin(email, password);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message || 'Não foi possível entrar.');
      return;
    }
    setErrorMessage('');
  };

  return (
    <div className="size-full flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-xl p-6 card-apple">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Bem-vinda ao Kiki</h1>
          <p className="text-sm text-muted-foreground">Entre com seu e-mail e senha</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria.silva@email.com"
                autoComplete="email"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500 input-apple"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500 input-apple"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold btn-apple-gradient shadow-md"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 bg-muted rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">
            Use seu usuário cadastrado no backend (`/auth/register`) para entrar.
          </p>
        </div>
      </div>
    </div>
  );
}
