import { ArrowLeft, AlertTriangle, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface DeleteAccountScreenProps {
  onNavigateBack?: () => void;
  onManageSubscription?: () => void;
}

export function DeleteAccountScreen({ onNavigateBack, onManageSubscription }: DeleteAccountScreenProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [hasActiveSubscription] = useState(true); // Simula se tem assinatura ativa

  const reasons = [
    'Não uso mais o aplicativo',
    'Encontrei uma alternativa melhor',
    'Preocupações com privacidade',
    'Muitas notificações',
    'Preço muito alto',
    'Problemas técnicos',
    'Outro motivo',
  ];

  const consequencesOfDeletion = [
    'Todos os seus dados pessoais serão permanentemente removidos',
    'Seu histórico de conversas com a Kiki será apagado',
    'Todos os eventos e lembretes serão perdidos',
    'Suas preferências e configurações serão excluídas',
    'Você perderá acesso a todas as integrações conectadas',
    'Esta ação não pode ser desfeita',
  ];

  const isConfirmValid = confirmText.toLowerCase() === 'excluir';

  const handleDelete = () => {
    if (isConfirmValid && !hasActiveSubscription) {
      // Aqui executaria a exclusão da conta
      console.log('Conta excluída');
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
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl mb-2">Excluir Conta</h1>
          <p className="text-sm text-muted-foreground">
            Sentiremos sua falta! Antes de prosseguir, leia atentamente.
          </p>
        </div>

        {/* Aviso de Assinatura Ativa */}
        {hasActiveSubscription && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Assinatura ativa detectada
                </p>
                <p className="text-xs text-amber-800 mb-3">
                  Você possui uma assinatura ativa da Kiki. Para excluir sua conta, você precisa primeiro cancelar sua assinatura.
                </p>
                <button
                  onClick={onManageSubscription}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg btn-apple font-medium"
                >
                  Gerenciar assinatura
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Motivo da Exclusão */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">
            Por que você está saindo? (opcional)
          </label>
          <div className="space-y-2">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all btn-apple ${
                  reason === r
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      reason === r ? 'border-purple-500' : 'border-gray-300'
                    }`}
                  >
                    {reason === r && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                  </div>
                  <span className="text-sm">{r}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Consequências */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-red-600">
            O que acontecerá quando você excluir sua conta:
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <ul className="space-y-2">
              {consequencesOfDeletion.map((consequence, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-red-800">
                  <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{consequence}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Confirmação */}
        {!hasActiveSubscription && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Digite "EXCLUIR" para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {confirmText && !isConfirmValid && (
              <p className="text-xs text-red-500 mt-2">
                Digite exatamente "EXCLUIR" para confirmar
              </p>
            )}
          </div>
        )}

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-700 mb-2">
            💜 Ainda não quer sair?
          </p>
          <p className="text-xs text-purple-600 mb-3">
            Se você está enfrentando problemas, nossa equipe de suporte está pronta para ajudar. Podemos resolver juntos!
          </p>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg btn-apple font-medium">
            Falar com suporte
          </button>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <button
          onClick={onNavigateBack}
          className="w-full bg-muted text-foreground py-4 rounded-full font-semibold btn-apple"
        >
          Manter minha conta
        </button>
        <button
          onClick={() => setShowConfirmation(true)}
          disabled={hasActiveSubscription || !isConfirmValid}
          className="w-full bg-red-500 text-white py-4 rounded-full font-semibold flex items-center justify-center gap-2 btn-apple disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-all"
        >
          <Trash2 className="w-5 h-5" />
          Excluir permanentemente
        </button>
      </div>

      {/* Modal de Confirmação Final */}
      {showConfirmation && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setShowConfirmation(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Tem certeza absoluta?</h2>
              <p className="text-sm text-muted-foreground">
                Esta é sua última chance. Depois disso, não há volta.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleDelete}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold btn-apple"
              >
                Sim, excluir minha conta
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="w-full bg-muted text-foreground py-3 rounded-full font-semibold btn-apple"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
