import { Send, Sparkles, Calendar, Clock, CheckCircle2, ListTodo, Mic, MicOff, Menu, X, Phone, Square } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveKitVoiceRoom } from '@/hooks/useLiveKitVoiceRoom';
import { voiceCenterPrimary, voiceCenterSecondary, voiceOverlayCaption } from '@/lib/voiceUiCaptions';
import { streamChat, type ChatApiMessage } from '@/services/chat';
import { transcribeChatAudio } from '@/services/transcription';

// Web Speech API (Chrome/Edge/Safari). O TS DOM padrão não inclui esses tipos.
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SILENCE_AUTO_SEND_MS = 1500;

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

const TYPING_SPEED_MS = 18;

function TypingText({ text, animate, streaming, onFinished }: {
  text: string;
  animate: boolean;
  streaming?: boolean;
  onFinished?: () => void;
}) {
  const [revealed, setRevealed] = useState(0);
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    if (!animate) {
      setRevealed(textRef.current.length);
      return;
    }
    const id = window.setInterval(() => {
      setRevealed((prev) => {
        const target = textRef.current.length;
        if (prev >= target) return prev;
        return prev + 1;
      });
    }, TYPING_SPEED_MS);
    return () => window.clearInterval(id);
  }, [animate]);

  useEffect(() => {
    if (!animate) setRevealed(text.length);
  }, [animate, text.length]);

  useEffect(() => {
    if (!streaming && animate && revealed >= text.length && text.length > 0) {
      onFinished?.();
    }
  }, [streaming, animate, revealed, text.length, onFinished]);

  return <>{text.slice(0, animate ? revealed : text.length)}</>;
}

const MAX_RECORDING_MS = 120_000;

export function ChatScreen({ onOpenMenu, onNavigateToProfile, onNavigateToHome, userName = 'Maria Silva' }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: WELCOME_MESSAGE_FULL,
      sender: 'kiki',
      timestamp: new Date(),
      streamingPhase: 'typing',
    },
  ]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [inputValue, setInputValue] = useState('');
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveDictating, setIsLiveDictating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const voice = useLiveKitVoiceRoom();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingMimeRef = useRef<string>('audio/webm');
  const maxRecordingTimerRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<number | null>(null);
  const messagesEndContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceDisconnectRef = useRef(voice.disconnect);
  voiceDisconnectRef.current = voice.disconnect;

  useEffect(() => {
    return () => {
      void voiceDisconnectRef.current();
    };
  }, []);

  useEffect(() => {
    const el = messagesEndContainerRef.current;
    if (!el) return;
    const scroll = () => { el.scrollTop = el.scrollHeight; };
    scroll();
    const observer = new MutationObserver(scroll);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const waveMode: 'idle' | 'user-speaking' | 'thinking' | 'kiki-speaking' =
    voice.phase === 'connected' ? voice.turnVisual : 'idle';

  function messagesToApiPayload(history: Message[]): ChatApiMessage[] {
    return history
      .filter((m) => (m.text ?? '').trim().length > 0)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
  }

  function nextMessageId(history: Message[]): number {
    return history.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  }

  useEffect(() => {
    const delay = WELCOME_MESSAGE_FULL.length * TYPING_SPEED_MS + 200;
    const timer = window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === 1 ? { ...m, streamingPhase: undefined } : m)),
      );
    }, delay);
    return () => window.clearTimeout(timer);
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

  const clearMaxRecordingTimer = useCallback(() => {
    if (maxRecordingTimerRef.current != null) {
      window.clearTimeout(maxRecordingTimerRef.current);
      maxRecordingTimerRef.current = null;
    }
  }, []);

  const sendMessageWithText = useCallback(
    async (text: string, isUserAudio: boolean) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const base = messagesRef.current;
      const userMessage: Message = {
        id: nextMessageId(base),
        text: trimmed,
        sender: 'user',
        timestamp: new Date(),
        isUserAudio,
      };

      const transcript = [...base, userMessage];
      const apiMessages = messagesToApiPayload(transcript);

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
        onDone: (interrupted) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== kikiId) return m;
              const finalText = m.text.trim() || '(Sem texto na resposta.)';
              return { ...m, text: finalText };
            }),
          );
          if (interrupted) {
            setSendError('Conexão instável: a resposta pode estar incompleta. Envie de novo se precisar.');
          }
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
    },
    [isSending],
  );

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessageWithText(text, false);
  };

  const stopRecordingAndTranscribe = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;
    const mime = recordingMimeRef.current || 'audio/webm';

    if (!mr || mr.state === 'inactive') {
      setIsRecording(false);
      clearMaxRecordingTimer();
      return;
    }

    const blobPromise = new Promise<Blob>((resolve, reject) => {
      mr.onstop = () => {
        try {
          const blob = new Blob(recordingChunksRef.current, { type: mime });
          resolve(blob);
        } catch (e) {
          reject(e);
        }
      };
      mr.stop();
      stream?.getTracks().forEach((t) => t.stop());
    });

    clearMaxRecordingTimer();
    setIsRecording(false);
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;

    try {
      const blob = await blobPromise;
      if (blob.size < 256) {
        setSendError('Gravação muito curta.');
        return;
      }
      setIsTranscribing(true);
      setSendError(null);
      const text = await transcribeChatAudio(blob);
      await sendMessageWithText(text, true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível transcrever.';
      setSendError(msg);
    } finally {
      setIsTranscribing(false);
    }
  }, [clearMaxRecordingTimer, sendMessageWithText]);

  stopRecordingRef.current = stopRecordingAndTranscribe;

  const startRecording = useCallback(async () => {
    if (isSending || isTranscribing || isRecording) return;
    setSendError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      recordingMimeRef.current = mime || 'audio/webm';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recordingChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      clearMaxRecordingTimer();
      maxRecordingTimerRef.current = window.setTimeout(() => {
        void stopRecordingRef.current();
      }, MAX_RECORDING_MS);
      setIsRecording(true);
    } catch {
      setSendError('Permita o uso do microfone para gravar.');
    }
  }, [clearMaxRecordingTimer, isSending, isTranscribing, isRecording]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current != null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopLiveDictation = useCallback(
    (options?: { send?: boolean }) => {
      const send = options?.send ?? true;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.stop();
        } catch {
          /* ignora estados inválidos */
        }
      }
      recognitionRef.current = null;
      clearSilenceTimer();
      setIsLiveDictating(false);

      const fullText = (finalTranscriptRef.current || '').trim();
      finalTranscriptRef.current = '';

      if (send && fullText) {
        setInputValue('');
        void sendMessageWithText(fullText, true);
      }
    },
    [clearSilenceTimer, sendMessageWithText],
  );

  const startLiveDictation = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;
    if (isSending || isTranscribing || isRecording || isLiveDictating) return true;

    let recognition: SpeechRecognitionLike;
    try {
      recognition = new Ctor();
    } catch {
      return false;
    }
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = '';
    setInputValue('');
    setSendError(null);

    recognition.onresult = (event) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? '';
        if (result.isFinal) finalChunk += piece;
        else interim += piece;
      }
      if (finalChunk) {
        const sep = finalTranscriptRef.current && !finalTranscriptRef.current.endsWith(' ') ? ' ' : '';
        finalTranscriptRef.current = `${finalTranscriptRef.current}${sep}${finalChunk}`.replace(/\s+/g, ' ');
      }
      const live = `${finalTranscriptRef.current}${interim ? ` ${interim}` : ''}`.replace(/\s+/g, ' ').trim();
      setInputValue(live);

      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(() => {
        stopLiveDictation({ send: true });
      }, SILENCE_AUTO_SEND_MS);
    };

    recognition.onerror = (e) => {
      const code = e?.error || '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setSendError('Permita o uso do microfone para ditar.');
      } else if (code === 'no-speech') {
        setSendError(null);
      } else if (code && code !== 'aborted') {
        setSendError('Não foi possível reconhecer a fala. Tente novamente.');
      }
      stopLiveDictation({ send: false });
    };

    recognition.onend = () => {
      // Se ainda estamos no modo ditado, finaliza enviando o que tem.
      if (recognitionRef.current === recognition) {
        stopLiveDictation({ send: true });
      }
    };

    try {
      recognition.start();
    } catch {
      stopLiveDictation({ send: false });
      return false;
    }
    recognitionRef.current = recognition;
    setIsLiveDictating(true);
    return true;
  }, [clearSilenceTimer, isLiveDictating, isRecording, isSending, isTranscribing, stopLiveDictation]);

  useEffect(() => {
    return () => {
      clearMaxRecordingTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      clearSilenceTimer();
      const r = recognitionRef.current;
      if (r) {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        try {
          r.abort();
        } catch {
          /* noop */
        }
        recognitionRef.current = null;
      }
    };
  }, [clearMaxRecordingTimer, clearSilenceTimer]);

  const handleComposerMic = () => {
    if (isSending || isTranscribing) return;
    if (isLiveDictating) {
      stopLiveDictation({ send: true });
      return;
    }
    if (isRecording) {
      void stopRecordingAndTranscribe();
      return;
    }
    if (startLiveDictation()) return;
    void startRecording();
  };

  const beginVoiceCall = async () => {
    setSendError(null);
    setIsVoiceCallActive(true);
    await voice.connect();
  };

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

          <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-0">
            <div className="relative w-48 h-48 mb-8 shrink-0">
              {/* Ondas de áudio */}
              <div className="absolute inset-0 flex items-center justify-center">
                {waveMode !== 'idle' && (
                  <>
                    {Array.from({ length: 40 }).map((_, i) => {
                      const angle = (i / 40) * Math.PI * 2;
                      const distance = 60 + Math.sin(i * 0.5) * 10;
                      const x = Math.cos(angle) * distance;
                      const y = Math.sin(angle) * distance;

                      const barColor =
                        waveMode === 'user-speaking'
                          ? 'rgb(168, 85, 247)'
                          : waveMode === 'thinking'
                            ? 'rgb(245, 158, 11)'
                            : 'rgb(236, 72, 153)';

                      return (
                        <div
                          key={i}
                          className="absolute w-1 rounded-full animate-pulse"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            height: `${Math.sin(i * 0.3) * 20 + 30}px`,
                            backgroundColor: barColor,
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
                <div
                  className={`w-32 h-32 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
                    waveMode === 'user-speaking'
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600 scale-110'
                      : waveMode === 'thinking'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 scale-110'
                        : waveMode === 'kiki-speaking'
                          ? 'bg-gradient-to-br from-pink-500 to-pink-600 scale-110'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}
                >
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

      <div ref={messagesEndContainerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-3 scrollbar-hide">
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
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {message.sender === 'kiki' ? (
                    <TypingText
                      text={message.text}
                      animate={message.streamingPhase === 'typing'}
                      streaming={isSending && message.streamingPhase === 'typing'}
                      onFinished={() => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === message.id ? { ...m, streamingPhase: undefined } : m,
                          ),
                        );
                      }}
                    />
                  ) : (
                    message.text
                  )}
                </p>
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
        {(isRecording || isTranscribing || isLiveDictating) && (
          <p className="text-xs text-muted-foreground mb-2">
            {isTranscribing
              ? 'Transcrevendo…'
              : isLiveDictating
                ? 'Ouvindo… pare de falar para enviar (ou toque no microfone)'
                : 'Gravando… toque no microfone de novo para enviar'}
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

        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-end gap-1.5 bg-muted rounded-2xl p-1.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                const ta = e.target;
                ta.style.height = 'auto';
                ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                isLiveDictating
                  ? 'Ouvindo…'
                  : isTranscribing
                    ? 'Transcrevendo…'
                    : isSending
                      ? 'Enviando...'
                      : 'Digite sua mensagem...'
              }
              disabled={isSending || isTranscribing}
              className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none disabled:opacity-50 resize-none overflow-y-auto max-h-[120px] leading-relaxed"
              style={{ height: 'auto' }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!inputValue.trim() || isSending || isTranscribing || isLiveDictating}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white btn-apple-gradient disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleComposerMic}
            disabled={isSending || isTranscribing}
            title={
              isLiveDictating
                ? 'Parar de ouvir e enviar'
                : isRecording
                  ? 'Parar gravação e enviar (transcrição)'
                  : 'Falar com a Kiki (transcreve em tempo real)'
            }
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              isRecording || isLiveDictating
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {isRecording || isLiveDictating ? (
              <Square className="w-5 h-5 text-white fill-current" />
            ) : (
              <Mic className="w-5 h-5 text-foreground" />
            )}
          </button>

          <button
            type="button"
            onClick={handleStartVoiceCall}
            disabled={isSending || isRecording || isTranscribing || isLiveDictating}
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
