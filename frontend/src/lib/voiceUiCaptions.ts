import type { VoiceConnectionPhase, VoiceTurnVisual } from '@/hooks/useLiveKitVoiceRoom';

export interface VoiceUiCaptionsInput {
  phase: VoiceConnectionPhase;
  turnVisual: VoiceTurnVisual;
  isConnected: boolean;
  errorMessage: string | null;
}

export function voiceOverlayCaption(v: VoiceUiCaptionsInput): string {
  if (v.phase === 'connecting') return 'Conectando à Kiki...';
  if (v.phase === 'error') return v.errorMessage ?? 'Erro na chamada.';
  if (!v.isConnected) return 'Aguardando...';
  if (v.turnVisual === 'user-speaking') return 'Você está falando...';
  if (v.turnVisual === 'kiki-speaking') return 'Kiki está respondendo...';
  return 'Conectado — pode falar com a Kiki';
}

export function voiceCenterPrimary(v: VoiceUiCaptionsInput): string {
  if (v.phase === 'connecting') return 'Conectando';
  if (v.phase === 'error') return 'Algo deu errado';
  if (!v.isConnected) return 'Aguarde';
  if (v.turnVisual === 'user-speaking') return 'Ouvindo você...';
  if (v.turnVisual === 'kiki-speaking') return 'Kiki está falando';
  return 'Toque para silenciar ou ativar o microfone';
}

export function voiceCenterSecondary(v: VoiceUiCaptionsInput): string {
  if (v.phase === 'connecting') return 'Preparando áudio...';
  if (v.phase === 'error') return 'Encerre e tente novamente.';
  if (!v.isConnected) return 'Estabelecendo chamada...';
  if (v.turnVisual === 'user-speaking') return 'Continue falando naturalmente';
  if (v.turnVisual === 'kiki-speaking') return 'Aguarde a resposta em voz';
  return 'O microfone fica ligado na chamada';
}
