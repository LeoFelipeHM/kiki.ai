import { ArrowLeft, CreditCard, Check, Calendar, Receipt, AlertCircle, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface ManageSubscriptionScreenProps {
  onNavigateBack?: () => void;
}

export function ManageSubscriptionScreen({ onNavigateBack }: ManageSubscriptionScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savedPaymentMethod, setSavedPaymentMethod] = useState<'pix' | 'boleto' | 'card'>('card');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto' | 'card' | null>(null);
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [savedCardData, setSavedCardData] = useState({
    number: '**** **** **** 1234',
    name: 'MARIA SILVA',
    expiry: '12/2028',
  });

  const [currentPlan] = useState({
    name: 'Premium',
    price: 29.90,
    billingCycle: 'mensal',
    nextBillingDate: '28 de Maio, 2026',
    status: 'active',
  });

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      billingCycle: 'sempre',
      features: [
        'Assistente básica da Kiki',
        'Até 10 lembretes por mês',
        'Calendário simples',
        'Suporte por e-mail',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 29.90,
      billingCycle: 'mensal',
      popular: true,
      features: [
        'Kiki com IA avançada',
        'Lembretes ilimitados',
        'Sugestões inteligentes',
        'Integração com Google Calendar',
        'Análise de produtividade',
        'Suporte prioritário',
      ],
    },
    {
      id: 'premium-yearly',
      name: 'Premium Anual',
      price: 299.90,
      billingCycle: 'anual',
      discount: '17% de desconto',
      features: [
        'Tudo do Premium mensal',
        '2 meses grátis',
        'Acesso antecipado a novos recursos',
        'Sessões 1:1 com especialistas',
        'Relatórios personalizados',
      ],
    },
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    // Scroll para forma de pagamento
    setTimeout(() => {
      const paymentSection = document.getElementById('payment-section');
      paymentSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const paymentHistory = [
    { id: 1, date: '28 de Abril, 2026', amount: 29.90, status: 'Pago', method: 'Cartão ****1234' },
    { id: 2, date: '28 de Março, 2026', amount: 29.90, status: 'Pago', method: 'Cartão ****1234' },
    { id: 3, date: '28 de Fevereiro, 2026', amount: 29.90, status: 'Pago', method: 'Cartão ****1234' },
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
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">Gerenciar Assinatura</h1>
          <p className="text-sm text-muted-foreground">
            Seu plano atual e opções de pagamento
          </p>
        </div>

        {/* Plano Atual */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Plano Atual
          </h3>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5" />
                  <h3 className="text-lg font-bold">{currentPlan.name}</h3>
                </div>
                <p className="text-white/80 text-sm">
                  R$ {currentPlan.price.toFixed(2)}/{currentPlan.billingCycle}
                </p>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                Ativo
              </div>
            </div>
            <div className="border-t border-white/20 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Próxima cobrança:</span>
                <span className="font-medium">{currentPlan.nextBillingDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Planos Disponíveis */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Explorar Planos
          </h3>
          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handlePlanSelect(plan.id)}
                className={`relative bg-card border rounded-2xl p-4 w-full text-left transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 ring-2 ring-purple-500/20'
                    : plan.popular
                    ? 'border-purple-300'
                    : 'border-border'
                }`}
              >
                {plan.popular && selectedPlan !== plan.id && (
                  <div className="absolute -top-2 left-4 px-3 py-0.5 bg-gradient-to-r ${themeColor} text-white text-xs font-semibold rounded-full">
                    Mais popular
                  </div>
                )}
                {selectedPlan === plan.id && (
                  <div className="absolute -top-2 left-4 px-3 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                    Selecionado
                  </div>
                )}
                <div className="mb-3">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h4 className="text-lg font-bold">{plan.name}</h4>
                    {plan.discount && (
                      <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                        {plan.discount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">R$ {plan.price.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">/{plan.billingCycle}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        {/* Forma de Pagamento */}
        <div className="mb-6" id="payment-section">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Forma de Pagamento
          </h3>
          <div className="bg-card border border-border rounded-2xl p-4">
            {savedPaymentMethod === 'card' && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cartão de Crédito</p>
                    <p className="text-xs text-muted-foreground">{savedCardData.number}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="text-purple-600 text-sm font-medium btn-apple"
                  >
                    Alterar
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Expira em {savedCardData.expiry}
                </div>
              </>
            )}
            {savedPaymentMethod === 'pix' && (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">PIX</p>
                  <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="text-purple-600 text-sm font-medium btn-apple"
                >
                  Alterar
                </button>
              </div>
            )}
            {savedPaymentMethod === 'boleto' && (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Boleto Bancário</p>
                  <p className="text-xs text-muted-foreground">Vencimento em 3 dias</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="text-purple-600 text-sm font-medium btn-apple"
                >
                  Alterar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Pagamentos */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Histórico de Pagamentos
          </h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {paymentHistory.map((payment, index) => (
              <div
                key={payment.id}
                className={`flex items-center gap-3 p-4 ${
                  index !== paymentHistory.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{payment.date}</p>
                  <p className="text-xs text-muted-foreground">{payment.method}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">R$ {payment.amount.toFixed(2)}</p>
                  <p className="text-xs text-green-600">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="p-5 space-y-2">
        <button
          onClick={() => {
            // Salva as alterações do plano e método de pagamento
            onNavigateBack?.();
          }}
          className="w-full bg-gradient-to-br from-purple-500 to-pink-500 text-white py-4 rounded-full font-semibold btn-apple-gradient shadow-lg hover:shadow-xl transition-all"
        >
          Salvar alterações
        </button>
        <button className="w-full text-red-500 text-sm py-2 btn-apple hover:text-red-600">
          Cancelar assinatura
        </button>
      </div>

      {/* Modal de Forma de Pagamento */}
      {showPaymentModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-background rounded-3xl shadow-2xl z-50 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Forma de Pagamento</h2>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-4 rounded-xl border-2 transition-all btn-apple ${
                  paymentMethod === 'card' ? `border-purple-500 bg-purple-50` : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-purple-600' : 'text-muted-foreground'}`} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">Cartão de Crédito</p>
                    <p className="text-xs text-muted-foreground">Débito automático mensal</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('pix')}
                className={`w-full p-4 rounded-xl border-2 transition-all btn-apple ${
                  paymentMethod === 'pix' ? `border-purple-500 bg-purple-50` : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">PIX</p>
                    <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('boleto')}
                className={`w-full p-4 rounded-xl border-2 transition-all btn-apple ${
                  paymentMethod === 'boleto' ? `border-purple-500 bg-purple-50` : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Receipt className={`w-6 h-6 ${paymentMethod === 'boleto' ? 'text-purple-600' : 'text-muted-foreground'}`} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">Boleto Bancário</p>
                    <p className="text-xs text-muted-foreground">Vencimento em 3 dias</p>
                  </div>
                </div>
              </button>
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Número do cartão</label>
                  <input
                    type="text"
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nome no cartão</label>
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    placeholder="Nome como está no cartão"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Validade</label>
                    <input
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CVV</label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                      placeholder="123"
                      maxLength={3}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => {
                  if (paymentMethod) {
                    setSavedPaymentMethod(paymentMethod);
                    if (paymentMethod === 'card' && cardData.number) {
                      const lastFour = cardData.number.slice(-4);
                      setSavedCardData({
                        number: `**** **** **** ${lastFour}`,
                        name: cardData.name.toUpperCase(),
                        expiry: cardData.expiry,
                      });
                    }
                    setShowPaymentModal(false);
                    setPaymentMethod(null);
                    setCardData({ number: '', name: '', expiry: '', cvv: '' });
                  }
                }}
                disabled={!paymentMethod || (paymentMethod === 'card' && (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv))}
                className="w-full bg-gradient-to-br from-purple-500 to-pink-500 text-white py-3 rounded-full font-semibold btn-apple-gradient disabled:opacity-50"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMethod(null);
                  setCardData({ number: '', name: '', expiry: '', cvv: '' });
                }}
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
