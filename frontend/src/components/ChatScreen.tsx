import { Send, Sparkles, Calendar, Clock, CheckCircle2, ListTodo, Mic, MicOff, Menu, X, Phone } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLiveKitVoiceRoom } from '@/hooks/useLiveKitVoiceRoom';
import { voiceCenterPrimary, voiceCenterSecondary, voiceOverlayCaption } from '@/lib/voiceUiCaptions';
import { streamChat, type ChatApiMessage } from '@/services/chat';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'kiki';
  timestamp: Date;
  isUserAudio?: boolean;
  /** Resposta em andamento: “pensando” antes do 1º token; “digitando” em streaming. */
  streamingPhase?: 'thinking' | 'typing';
}

interface ChatScreenProps {
  onOpenMenu?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHome?: () => void;
  userName?: string;
}

const WELCOME_MESSAGE_FULL =
  'Olá! Sou a Kiki, sua assistente pessoal. Como posso ajudar você hoje?';

export function ChatScreen({ onOpenMenu, onNavigateToProfile, onNavigateToHome, userName = 'Maria Silva' }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '',
      sender: 'kiki',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const voice = useLiveKitVoiceRoom();
  const voiceDisconnectRef = useRef(voice.disconnect);
  voiceDisconnectRef.current = voice.disconnect;

  useEffect(() => {
    return () => {
      void voiceDisconnectRef.current();
    };
  }, []);

  const waveMode: 'idle' | 'user-speaking' | 'kiki-speaking' =
    voice.phase === 'connected' ? voice.turnVisual : 'idle';

  function messagesToApiPayload(history: Message[]): ChatApiMessage[] {
    return history
      .filter((m) => !(m.sender === 'user' && m.isUserAudio))
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
  }

  function nextMessageId(history: Message[]): number {
    return history.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  }

  /** Boas-vindas: digitação letra a letra (mensagem id 1). */
  useEffect(() => {
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setMessages((prev) =>
        prev.map((m) => (m.id === 1 ? { ...m, text: WELCOME_MESSAGE_FULL.slice(0, i) } : m)),
      );
      if (i >= WELCOME_MESSAGE_FULL.length) window.clearInterval(iv);
    }, 26);
    return () => window.clearInterval(iv);
  }, []);

  /**
   * Streaming: renderiza tokens imediatamente (sem “digitação” artificial).
   * Isso reduz muito a latência percebida.
   */

  const showQuickSuggestions = !messages.some((m) => m.sender === 'user');

  const quickActions = [
    { icon: Calendar, label: 'Agendar reunião', color: 'bg-blue-100 text-blue-600' },
    { icon: Clock, label: 'Criar lembrete', color: 'bg-purple-100 text-purple-600' },
    { icon: ListTodo, label: 'Organizar meu dia', color: 'bg-green-100 text-green-600' },
    { icon: CheckCircle2, label: 'Planejar semana', color: 'bg-pink-100 text-pink-600' },
  ];

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    const userMessage: Message = {
      id: nextMessageId(messages),
      text,
      sender: 'user',
      timestamp: new Date(),
      isUserAudio: false,
    };

    const transcript = [...messages, userMessage];
    const apiMessages = messagesToApiPayload(transcript);

    setInputValue('');
    setMessages(transcript);
    setSendError(null);
    setIsSending(true);

    const kikiId = nextMessageId(transcript);

    setMessages([
      ...transcript,
      {
        id: kikiId,
        text: '',
        sender: 'kiki',
        timestamp: new Date(),
        streamingPhase: 'thinking',
      },
    ]);

    let sawDelta = false;

    await streamChat(apiMessages, {
      onDelta: (delta) => {
        if (!sawDelta) sawDelta = true;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === kikiId
              ? {
                  ...m,
                  text: (m.text ?? '') + delta,
                  streamingPhase: 'typing' as const,
                }
              : m,
          ),
        );
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== kikiId) return m;
            const finalText = m.text.trim() || '(Sem texto na resposta.)';
            return { ...m, text: finalText, streamingPhase: undefined };
          }),
        );
        setIsSending(false);
      },
      onError: (msg) => {
        setMessages((prev) => prev.filter((m) => m.id !== kikiId));
        const fallback = 'Não foi possível obter resposta da Kiki.';
        if (msg.includes('sessão') || msg.includes('login')) {
          setSendError(msg);
        } else {
          setSendError(msg || fallback);
        }
        setIsSending(false);
      },
    });
  };

  const beginVoiceCall = async () => {
    setSendError(null);
    setIsVoiceCallActive(true);
    await voice.connect();
  };

  const handleComposerMic = () => void beginVoiceCall();

  const handleStartVoiceCall = () => void beginVoiceCall();

  const handleEndVoiceCall = async () => {
    await voice.disconnect();
    setIsVoiceCallActive(false);
  };

  const handleVoiceCallToggleMic = () => void voice.toggleMicrophone();

  // Voice Call Interface
  if (isVoiceCallActive) {
    return (
      <>
        <div className="flex-1 flex flex-col bg-background">
          <div className="px-5 pt-6 pb-3 border-b border-border bg-background">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={onOpenMenu}
                className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center btn-apple"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={onNavigateToHome}
                className="text-xl font-semibold btn-apple"
              >
                Kiki
              </button>
              <button
                onClick={onNavigateToProfile}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm btn-apple-gradient shadow-md"
              >
                <span className="text-white font-medium">{userName.charAt(0).toUpperCase()}</span>
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base mb-0">Ligação com KIKI</h2>
                <p className="text-xs text-muted-foreground">{voiceOverlayCaption(voice)}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className="relative w-48 h-48 mb-8">
              {/* Ondas de áudio */}
              <div className="absolute inset-0 flex items-center justify-center">
                {waveMode !== 'idle' && (
                  <>
                    {Array.from({ length: 40 }).map((_, i) => {
                      const angle = (i / 40) * Math.PI * 2;
                      const distance = 60 + Math.sin(i * 0.5) * 10;
                      const x = Math.cos(angle) * distance;
                      const y = Math.sin(angle) * distance;

                      return (
                        <div
                          key={i}
                          className="absolute w-1 rounded-full animate-pulse"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            height: `${Math.sin(i * 0.3) * 20 + 30}px`,
                            backgroundColor: waveMode === 'user-speaking'
                              ? 'rgb(168, 85, 247)'
                              : 'rgb(236, 72, 153)',
                            transform: 'translate(-50%, -50%)',
                            animationDuration: `${0.5 + Math.random() * 0.5}s`,
                            animationDelay: `${i * 0.02}s`,
                            opacity: 0.6,
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </div>

              {/* Avatar central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
                  waveMode === 'user-speaking'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 scale-110'
                    : waveMode === 'kiki-speaking'
                    ? 'bg-gradient-to-br from-pink-500 to-pink-600 scale-110'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  <Sparkles className="w-16 h-16" />
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <p className="text-lg font-medium mb-1">{voiceCenterPrimary(voice)}</p>
              <p className="text-sm text-muted-foreground">{voiceCenterSecondary(voice)}</p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleVoiceCallToggleMic}
                disabled={voice.phase !== 'connected'}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  voice.phase === 'connected'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-110'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {voice.micEnabled ? (
                  <Mic className="w-7 h-7 text-white" />
                ) : (
                  <MicOff className="w-7 h-7 text-white" />
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleEndVoiceCall()}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:scale-110"
              >
                <X className="w-7 h-7 text-white" />
              </button>
            </div>
          </div>
        </div>

      </>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-background px-5 pb-3 pt-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onOpenMenu}
            className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center btn-apple"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={onNavigateToHome}
            className="text-xl font-semibold btn-apple"
          >
            Kiki
          </button>
          <button
            onClick={onNavigateToProfile}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm btn-apple-gradient shadow-md"
          >
            <span className="text-white font-medium">{userName.charAt(0).toUpperCase()}</span>
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base mb-0">KIKI</h2>
            <p className="text-xs text-muted-foreground">Assistente Pessoal</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 scrollbar-hide">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-3 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                message.sender === 'user'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  : 'bg-muted text-foreground'
              }`}
            >
              {message.sender === 'user' && message.isUserAudio && (
                <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/20">
                  <Mic className="w-3.5 h-3.5 opacity-70" />
                  <span className="text-[10px] opacity-70">Áudio</span>
                </div>
              )}

              {message.sender === 'kiki' && message.streamingPhase === 'thinking' ? (
                <p className="text-sm leading-relaxed flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                  <span>Kiki está pensando</span>
                  <span className="inline-flex items-center gap-0.5" aria-hidden>
                    {[0, 120, 240].map((delay) => (
                      <span
                        key={delay}
                        className="w-1 h-1 rounded-full bg-muted-foreground/75 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </p>
              ) : (
                <p className="text-sm leading-relaxed">{message.text}</p>
              )}

              <p
                className={`text-[10px] mt-1 ${
                  message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                }`}
              >
                {message.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-border bg-background px-5 pb-3 pt-2">
        {sendError && (
          <p className="text-xs text-destructive mb-2" role="alert">
            {sendError}
          </p>
        )}
        {showQuickSuggestions && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Sugestões rápidas</p>
            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(action.label)}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card hover:bg-muted btn-apple"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${action.color}`}>
                    <action.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 bg-muted rounded-full p-1.5">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={isSending ? 'Enviando...' : 'Digite sua mensagem...'}
              disabled={isSending}
              className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none disabled:opacity-50"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!inputValue.trim() || isSending}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white btn-apple-gradient disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleComposerMic}
            disabled={isSending}
            title="Chamada de voz com a Kiki"
            className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mic className="w-5 h-5 text-foreground" />
          </button>

          <button
            type="button"
            onClick={handleStartVoiceCall}
            disabled={isSending}
            title="Chamada de voz"
            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center text-white btn-apple-gradient shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
