import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AnimatedIcon } from "@/components/motion/AnimatedIcon";
import { motionDurations, motionEasings } from "@/lib/motion";

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'kiki';
  timestamp: Date;
  isUserAudio?: boolean;
}

export function ChatScreen() {
  const reduceMotion = useReducedMotion();
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
  const [isKikiTyping, setIsKikiTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, isKikiTyping, reduceMotion]);

  const quickActions = [
    { icon: Calendar, label: 'Agendar reunião', color: 'bg-blue-100 text-blue-600' },
    { icon: Clock, label: 'Criar lembrete', color: 'bg-purple-100 text-purple-600' },
    { icon: ListTodo, label: 'Organizar meu dia', color: 'bg-green-100 text-green-600' },
    { icon: CheckCircle2, label: 'Planejar semana', color: 'bg-pink-100 text-pink-600' },
  ];

  const barKeyframes = useMemo(() => {
    // 3 “poses” para criar um loop orgânico sem jitter
    const poses = Array.from({ length: 12 }).map((_, i) => {
      const base = Math.sin(i * 0.75) * 0.22 + 0.62;
      return [
        Math.max(0.35, base - 0.15),
        Math.min(1.0, base + 0.18),
        Math.max(0.35, base - 0.05),
      ];
    });
    return poses;
  }, []);

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
    setIsKikiTyping(true);

    setTimeout(() => {
      const kikiResponse: Message = {
        id: messages.length + 2,
        text: 'Entendi! Estou processando sua solicitação. Como posso ajudar mais?',
        sender: 'kiki',
        timestamp: new Date(),
      };
      setIsKikiTyping(false);
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
        setIsKikiTyping(true);

        setTimeout(() => {
          const kikiResponse: Message = {
            id: messages.length + 2,
            text: 'Claro! Entendi sua mensagem de áudio. Estou aqui para ajudar!',
            sender: 'kiki',
            timestamp: new Date(),
          };
          setIsKikiTyping(false);
          setMessages((prev) => [...prev, kikiResponse]);
        }, 1000);
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-8 pb-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm"
            initial={false}
            whileHover={reduceMotion ? undefined : { y: -1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: motionDurations.sm, ease: motionEasings.out }
            }
          >
            <AnimatedIcon hover="twist">
              <Sparkles className="w-6 h-6 text-white" />
            </AnimatedIcon>
          </motion.div>
          <div>
            <h2 className="mb-0.5">KIKI</h2>
            <p className="text-sm text-muted-foreground">Assistente Pessoal</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 pb-[260px]">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isUser = message.sender === "user";
            const isSpeaking = message.sender === "kiki" && kikiSpeakingMessageId === message.id;
            return (
              <motion.div
                key={message.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: motionDurations.md, ease: motionEasings.out }
                }
                className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    isUser
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {isUser && message.isUserAudio && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                      <Mic className="w-4 h-4 opacity-70" />
                      <span className="text-xs opacity-70">Áudio</span>
                    </div>
                  )}

                  <p className="leading-relaxed">{message.text}</p>

                  <AnimatePresence initial={false}>
                    {isSpeaking && (
                      <motion.div
                        key="speaking"
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { duration: motionDurations.sm, ease: motionEasings.out }
                        }
                        className="flex items-center gap-2 mt-3 pt-2 border-t border-border"
                      >
                        <motion.span
                          className="inline-flex"
                          animate={
                            reduceMotion ? undefined : { opacity: [0.7, 1, 0.7] }
                          }
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                          }
                        >
                          <Volume2 className="w-4 h-4 text-purple-500" />
                        </motion.span>

                        <div className="flex gap-1 flex-1 items-end">
                          {barKeyframes.map((frames, i) => (
                            <motion.div
                              // eslint-disable-next-line react/no-array-index-key
                              key={i}
                              className="w-1 bg-purple-500 rounded-full origin-bottom"
                              style={{ height: 18 }}
                              animate={reduceMotion ? undefined : { scaleY: frames }}
                              transition={
                                reduceMotion
                                  ? { duration: 0 }
                                  : {
                                      duration: 0.9,
                                      repeat: Infinity,
                                      repeatType: "mirror",
                                      ease: motionEasings.inOut,
                                      delay: i * 0.03,
                                    }
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs text-purple-600 dark:text-purple-300">
                          Respondendo…
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p
                    className={`text-xs mt-1.5 ${
                      isUser ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isKikiTyping && (
            <motion.div
              key="typing"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: motionDurations.sm, ease: motionEasings.out }
              }
              className="mb-4 flex justify-start"
            >
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted text-foreground shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Kiki</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <motion.span
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        className="size-1.5 rounded-full bg-foreground/40"
                        animate={reduceMotion ? undefined : { y: [0, -3, 0], opacity: [0.45, 0.9, 0.45] }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed left-0 right-0 bottom-[88px] max-w-md mx-auto px-6 pb-4 pt-4 bg-background/95 backdrop-blur border-t border-border">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-3">Sugestões rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInputValue(action.label)}
                className="group flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-[background-color,transform,box-shadow] duration-200 ease-out active:scale-[0.99] hover:shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${action.color} transition-[transform] duration-200 group-hover:scale-[1.04]`}
                >
                  <action.icon className="w-4 h-4 transition-[transform,opacity] duration-200 group-hover:opacity-90" />
                </div>
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full p-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Gravando..." : "Digite sua mensagem..."}
              disabled={isRecording}
              className="flex-1 bg-transparent px-4 py-2 outline-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-full"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isRecording}
              className="group w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm transition-[transform,opacity,box-shadow] duration-200 ease-out hover:opacity-95 hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <Send className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <motion.button
            onClick={handleVoiceRecord}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 shadow-sm ${
              isRecording
                ? "bg-red-500"
                : "bg-gradient-to-br from-purple-500 to-pink-500"
            }`}
            initial={false}
            animate={
              reduceMotion
                ? undefined
                : isRecording
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : isRecording
                  ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                  : { duration: motionDurations.sm, ease: motionEasings.out }
            }
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          >
            {!reduceMotion && isRecording && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.35)" }}
                animate={{ boxShadow: ["0 0 0 0 rgba(239, 68, 68, 0.35)", "0 0 0 10px rgba(239, 68, 68, 0)", "0 0 0 0 rgba(239, 68, 68, 0)"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <AnimatedIcon hover={isRecording ? "none" : "lift"}>
              {isRecording ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </AnimatedIcon>
          </motion.button>
        </div>

        <AnimatePresence initial={false}>
          {isRecording && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: motionDurations.sm, ease: motionEasings.out }
              }
              className="mt-3 flex items-center justify-center gap-2 text-muted-foreground"
            >
              <div className="flex gap-1 items-end">
                {Array.from({ length: 3 }).map((_, i) => (
                  <motion.div
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className="w-1 rounded-full bg-red-500 origin-bottom"
                    style={{ height: 12 }}
                    animate={reduceMotion ? undefined : { scaleY: [0.7, 1.15, 0.7] }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.8, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }
                    }
                  />
                ))}
              </div>
              <span className="text-sm">Gravando áudio…</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
