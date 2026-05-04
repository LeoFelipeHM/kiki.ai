import { Send, Sparkles, Calendar, Clock, CheckCircle2, ListTodo, Mic, MicOff, Volume2, Menu, X, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'kiki';
  timestamp: Date;
  isUserAudio?: boolean;
}

interface ChatScreenProps {
  onOpenMenu?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHome?: () => void;
  userName?: string;
}

export function ChatScreen({ onOpenMenu, onNavigateToProfile, onNavigateToHome, userName = 'Maria Silva' }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Olá! Sou a Kiki, sua assistente pessoal. Como posso ajudar você hoje?',
      sender: 'kiki',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [kikiSpeakingMessageId, setKikiSpeakingMessageId] = useState<number | null>(null);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [voiceCallState, setVoiceCallState] = useState<'idle' | 'user-speaking' | 'kiki-speaking'>('idle');

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'kiki') {
        setKikiSpeakingMessageId(lastMessage.id);
        const duration = Math.max(2000, lastMessage.text.length * 50);
        setTimeout(() => {
          setKikiSpeakingMessageId(null);
        }, duration);
      }
    }
  }, [messages]);

  const quickActions = [
    { icon: Calendar, label: 'Agendar reunião', color: 'bg-blue-100 text-blue-600' },
    { icon: Clock, label: 'Criar lembrete', color: 'bg-purple-100 text-purple-600' },
    { icon: ListTodo, label: 'Organizar meu dia', color: 'bg-green-100 text-green-600' },
    { icon: CheckCircle2, label: 'Planejar semana', color: 'bg-pink-100 text-pink-600' },
  ];

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      isUserAudio: false,
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    setTimeout(() => {
      const kikiResponse: Message = {
        id: messages.length + 2,
        text: 'Entendi! Estou processando sua solicitação. Como posso ajudar mais?',
        sender: 'kiki',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, kikiResponse]);
    }, 1000);
  };

  const handleVoiceRecord = () => {
    if (!isRecording) {
      setIsRecording(true);

      setTimeout(() => {
        setIsRecording(false);

        const newMessage: Message = {
          id: messages.length + 1,
          text: 'Mensagem de áudio enviada',
          sender: 'user',
          timestamp: new Date(),
          isUserAudio: true,
        };

        setMessages([...messages, newMessage]);

        setTimeout(() => {
          const kikiResponse: Message = {
            id: messages.length + 2,
            text: 'Claro! Entendi sua mensagem de áudio. Estou aqui para ajudar!',
            sender: 'kiki',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, kikiResponse]);
        }, 1000);
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  const handleStartVoiceCall = () => {
    setIsVoiceCallActive(true);
    setVoiceCallState('idle');

    // Simular conversa por voz
    setTimeout(() => {
      setVoiceCallState('kiki-speaking');
      setTimeout(() => {
        setVoiceCallState('idle');
      }, 3000);
    }, 1000);
  };

  const handleEndVoiceCall = () => {
    setIsVoiceCallActive(false);
    setVoiceCallState('idle');
  };

  const handleVoiceCallSpeak = () => {
    if (voiceCallState === 'idle') {
      setVoiceCallState('user-speaking');

      setTimeout(() => {
        setVoiceCallState('kiki-speaking');
        setTimeout(() => {
          setVoiceCallState('idle');
        }, 3000);
      }, 2500);
    }
  };

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
                <p className="text-xs text-muted-foreground">
                  {voiceCallState === 'idle' && 'Aguardando...'}
                  {voiceCallState === 'user-speaking' && 'Você está falando...'}
                  {voiceCallState === 'kiki-speaking' && 'Kiki está respondendo...'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <div className="relative w-48 h-48 mb-8">
              {/* Ondas de áudio */}
              <div className="absolute inset-0 flex items-center justify-center">
                {voiceCallState !== 'idle' && (
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
                            backgroundColor: voiceCallState === 'user-speaking'
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
                  voiceCallState === 'user-speaking'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 scale-110'
                    : voiceCallState === 'kiki-speaking'
                    ? 'bg-gradient-to-br from-pink-500 to-pink-600 scale-110'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  <Sparkles className="w-16 h-16" />
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <p className="text-lg font-medium mb-1">
                {voiceCallState === 'idle' && 'Toque para falar'}
                {voiceCallState === 'user-speaking' && 'Ouvindo você...'}
                {voiceCallState === 'kiki-speaking' && 'Kiki está falando'}
              </p>
              <p className="text-sm text-muted-foreground">
                {voiceCallState === 'idle' && 'Conversação natural com a Kiki'}
                {voiceCallState === 'user-speaking' && 'Continue falando normalmente'}
                {voiceCallState === 'kiki-speaking' && 'Processando sua resposta...'}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleVoiceCallSpeak}
                disabled={voiceCallState !== 'idle'}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  voiceCallState === 'idle'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-110'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <Mic className="w-7 h-7 text-white" />
              </button>

              <button
                onClick={handleEndVoiceCall}
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
      <div className="flex-1 flex flex-col">
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
            <h2 className="text-base mb-0">KIKI</h2>
            <p className="text-xs text-muted-foreground">Assistente Pessoal</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 scrollbar-hide">
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

              <p className="text-sm leading-relaxed">{message.text}</p>

              {message.sender === 'kiki' && kikiSpeakingMessageId === message.id && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                  <Volume2 className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                  <div className="flex gap-0.5 flex-1">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-purple-500 rounded-full animate-pulse"
                        style={{
                          height: `${Math.sin(i * 0.5) * 6 + 10}px`,
                          animationDelay: `${i * 50}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-purple-500">Reproduzindo...</span>
                </div>
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

      <div className="px-5 pb-3">
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

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 bg-muted rounded-full p-1.5">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Gravando..." : "Digite sua mensagem..."}
              disabled={isRecording}
              className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isRecording}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white btn-apple-gradient disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleVoiceRecord}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
              isRecording
                ? 'bg-red-500 animate-pulse'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-foreground" />}
          </button>

          <button
            onClick={handleStartVoiceCall}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center text-white btn-apple-gradient shadow-lg"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>

        {isRecording && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-muted-foreground">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <div className="w-0.5 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-0.5 h-2.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-xs">Gravando áudio...</span>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
