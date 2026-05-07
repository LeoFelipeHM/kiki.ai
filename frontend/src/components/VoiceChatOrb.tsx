import { Mic, X, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

export function VoiceChatOrb({ leftActions }: { leftActions?: React.ReactNode }) {
  const { themeColor } = useTheme();
  const [isCallActive, setIsCallActive] = useState(false);
  const [voiceCallState, setVoiceCallState] = useState<'idle' | 'user-speaking' | 'kiki-speaking'>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [kikiTranscript, setKikiTranscript] = useState('');

  useEffect(() => {
    if (voiceCallState === 'user-speaking') {
      setUserTranscript('');
      const words = ['Olá', 'Kiki,', 'como', 'está', 'minha', 'agenda', 'hoje?'];
      let currentIndex = 0;

      const transcriptionInterval = setInterval(() => {
        if (currentIndex < words.length) {
          setUserTranscript((prev) => (prev ? prev + ' ' + words[currentIndex] : words[currentIndex]));
          currentIndex++;
        } else {
          clearInterval(transcriptionInterval);
        }
      }, 15);

      const timer = setTimeout(() => {
        setVoiceCallState('kiki-speaking');
        setKikiTranscript('');

        const kikiWords = ['Você', 'tem', '3', 'reuniões', 'agendadas', 'para', 'hoje.', 'Posso', 'te', 'dar', 'mais', 'detalhes?'];
        let kikiIndex = 0;

        const kikiInterval = setInterval(() => {
          if (kikiIndex < kikiWords.length) {
            setKikiTranscript((prev) => (prev ? prev + ' ' + kikiWords[kikiIndex] : kikiWords[kikiIndex]));
            kikiIndex++;
          } else {
            clearInterval(kikiInterval);
          }
        }, 14);

        setTimeout(() => {
          setVoiceCallState('idle');
        }, 175);
      }, 112);

      return () => {
        clearTimeout(timer);
        clearInterval(transcriptionInterval);
      };
    }
  }, [voiceCallState]);

  const handleActivate = () => {
    setIsCallActive(true);
    setUserTranscript('');
    setKikiTranscript('');
    setVoiceCallState('user-speaking');
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setVoiceCallState('idle');
    setUserTranscript('');
    setKikiTranscript('');
  };

  const handleSpeak = () => {
    if (voiceCallState === 'idle') {
      setUserTranscript('');
      setKikiTranscript('');
      setVoiceCallState('user-speaking');
    }
  };

  // Voice Call Popup Interface
  if (isCallActive) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={handleEndCall}></div>
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-80 bg-background rounded-3xl shadow-2xl z-50 max-w-md mx-auto border border-border">
        <div className="flex flex-col items-center justify-center px-6 py-8">
          <div className="relative w-32 h-32 mb-8">
            {/* Ondas de áudio */}
            <div className="absolute inset-0 flex items-center justify-center">
              {voiceCallState !== 'idle' && (
                <>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const angle = (i / 30) * Math.PI * 2;
                    const distance = 40 + Math.sin(i * 0.5) * 8;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;

                    return (
                      <div
                        key={i}
                        className="absolute w-0.5 rounded-full animate-pulse"
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: `calc(50% + ${y}px)`,
                          height: `${Math.sin(i * 0.3) * 15 + 20}px`,
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
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
                voiceCallState === 'user-speaking'
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 scale-110'
                  : voiceCallState === 'kiki-speaking'
                  ? 'bg-gradient-to-br from-pink-500 to-pink-600 scale-110'
                  : 'bg-gradient-to-br ${themeColor}'
              }`}>
                <Sparkles className="w-12 h-12" />
              </div>
            </div>
          </div>

          <div className="text-center mb-8 min-h-[80px] max-w-[280px]">
            {voiceCallState === 'idle' && (
              <p className="text-sm text-muted-foreground">Toque no microfone para falar</p>
            )}
            {voiceCallState === 'user-speaking' && (
              <div>
                <p className="text-xs text-purple-500 mb-2">Você:</p>
                <p className="text-sm text-foreground">{userTranscript}</p>
              </div>
            )}
            {voiceCallState === 'kiki-speaking' && (
              <div>
                <p className="text-xs text-pink-500 mb-2">Kiki:</p>
                <p className="text-sm text-foreground">{kikiTranscript}</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSpeak}
              disabled={voiceCallState !== 'idle'}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                voiceCallState === 'idle'
                  ? 'bg-gradient-to-br ${themeColor} hover:scale-110'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <Mic className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:scale-110"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed bottom-6 right-0 left-0 max-w-md mx-auto z-40 pointer-events-none">
      <div className="absolute bottom-0 right-5 pointer-events-auto flex items-center gap-2">
        {leftActions ? <div className="flex items-center gap-2 flex-nowrap">{leftActions}</div> : null}
        <button
          onClick={handleActivate}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-2xl btn-apple transition-all bg-gradient-to-br ${themeColor}`}
          style={{ padding: '2.5px' }}
        >
          <div className="w-full h-full rounded-full bg-white p-[2px] flex items-center justify-center">
            <div className="w-full h-full rounded-full flex items-center justify-center voice-orb-breathing bg-white">
              <Mic className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
