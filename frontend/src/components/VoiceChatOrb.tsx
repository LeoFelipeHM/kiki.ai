import { Camera, Mic, MicOff, SwitchCamera, X, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { useLiveKitCameraFrames } from '@/hooks/useLiveKitCameraFrames';
import { useLiveKitVoiceRoom } from '@/hooks/useLiveKitVoiceRoom';
import { voiceCenterPrimary, voiceCenterSecondary, voiceOverlayCaption } from '@/lib/voiceUiCaptions';

export function VoiceChatOrb({ leftActions }: { leftActions?: React.ReactNode }) {
  const { themeColor } = useTheme();
  const voice = useLiveKitVoiceRoom();
  const camera = useLiveKitCameraFrames(voice.publishCameraFrame);
  const [isCallActive, setIsCallActive] = useState(false);

  const voiceDisconnectRef = useRef(voice.disconnect);
  voiceDisconnectRef.current = voice.disconnect;

  useEffect(() => {
    return () => {
      void voiceDisconnectRef.current();
    };
  }, []);

  const waveMode: 'idle' | 'user-speaking' | 'thinking' | 'kiki-speaking' =
    voice.phase === 'connected' ? voice.turnVisual : 'idle';

  const handleActivate = async () => {
    setIsCallActive(true);
    await voice.connect();
  };

  const handleEndCall = async () => {
    camera.stopCamera();
    await voice.disconnect();
    setIsCallActive(false);
  };

  useEffect(() => {
    if (!isCallActive) camera.stopCamera();
  }, [isCallActive, camera]);

  if (isCallActive) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          onClick={() => void handleEndCall()}
          aria-hidden
        />
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-80 bg-background rounded-3xl shadow-2xl z-50 max-w-md mx-auto border border-border">
          <div className="flex flex-col items-center justify-center px-6 py-8">
            {camera.isCameraActive ? (
              <div className="relative mb-6 aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-[1.5rem] bg-black shadow-xl">
                <video
                  ref={camera.videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${camera.cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              </div>
            ) : (
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                {waveMode !== 'idle' && (
                  <>
                    {Array.from({ length: 30 }).map((_, i) => {
                      const angle = (i / 30) * Math.PI * 2;
                      const distance = 40 + Math.sin(i * 0.5) * 8;
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
                          className="absolute w-0.5 rounded-full animate-pulse"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            height: `${Math.sin(i * 0.3) * 15 + 20}px`,
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

              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${
                    waveMode === 'user-speaking'
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600 scale-110'
                      : waveMode === 'thinking'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 scale-110'
                        : waveMode === 'kiki-speaking'
                          ? 'bg-gradient-to-br from-pink-500 to-pink-600 scale-110'
                          : `bg-gradient-to-br ${themeColor}`
                  }`}
                >
                  <Sparkles className="w-12 h-12" />
                </div>
              </div>
            </div>
            )}

            <div className="text-center mb-8 min-h-[80px] max-w-[280px]">
              <p className="text-xs text-muted-foreground mb-2">{voiceOverlayCaption(voice)}</p>
              <p className="text-sm font-medium text-foreground">{voiceCenterPrimary(voice)}</p>
              <p className="text-xs text-muted-foreground mt-1">{voiceCenterSecondary(voice)}</p>
              {camera.cameraError && <p className="mt-2 text-xs text-destructive">{camera.cameraError}</p>}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  camera.toggleCamera();
                }}
                disabled={voice.phase !== 'connected'}
                title={camera.isCameraActive ? 'Desligar câmera' : 'Ligar câmera'}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  camera.isCameraActive
                    ? 'bg-emerald-500 hover:bg-emerald-600 hover:scale-110'
                    : voice.phase === 'connected'
                      ? 'bg-muted hover:bg-muted/80 hover:scale-110'
                      : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <Camera className={`w-6 h-6 ${camera.isCameraActive ? 'text-white' : 'text-foreground'}`} />
              </button>

              {camera.isCameraActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void camera.switchCamera();
                  }}
                  disabled={camera.isCameraStarting}
                  title="Virar câmera"
                  className="w-14 h-14 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all shadow-lg hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <SwitchCamera className="w-6 h-6 text-foreground" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void voice.toggleMicrophone();
                }}
                disabled={voice.phase !== 'connected'}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  voice.phase === 'connected'
                    ? `bg-gradient-to-br ${themeColor} hover:scale-110`
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {voice.micEnabled ? (
                  <Mic className="w-5 h-5 text-white" />
                ) : (
                  <MicOff className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleEndCall();
                }}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:scale-110"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        <canvas ref={camera.canvasRef} className="hidden" aria-hidden />
      </>
    );
  }

  return (
    <div className="fixed bottom-6 right-0 left-0 max-w-md mx-auto z-40 pointer-events-none">
      <div className="absolute bottom-0 right-5 pointer-events-auto flex items-center gap-2">
        {leftActions ? <div className="flex items-center gap-2 flex-nowrap">{leftActions}</div> : null}
        <button
          type="button"
          onClick={() => void handleActivate()}
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
