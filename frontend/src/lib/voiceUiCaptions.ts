import type { VoiceConnectionPhase, VoiceTurnVisual } from '@/hooks/useLiveKitVoiceRoom';

export interface VoiceUiCaptionsInput {
  phase: VoiceConnectionPhase;
  turnVisual: VoiceTurnVisual;
  isConnected: boolean;
  errorMessage: string | null;
  /** Transcrição da fala do usuário (fluxo lk.transcription). */
  userTranscript?: string;
  /** Texto da resposta da Kiki (alinhado ao áudio ou antecipado). */
  agentTranscript?: string;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function voiceOverlayCaption(v: VoiceUiCaptionsInput): string {
  if (v.phase === 'connecting') return 'Conectando à Kiki...';
  if (v.phase === 'error') return v.errorMessage ?? 'Erro na chamada.';
  if (!v.isConnected) return 'Aguardando...';
  if (v.turnVisual === 'user-speaking') return 'Você está falando...';
  if (v.turnVisual === 'thinking') return 'Kiki está pensando...';
  if (v.turnVisual === 'kiki-speaking') return 'Kiki está respondendo...';
  return 'Conectado — pode falar com a Kiki';
}

export function voiceCenterPrimary(v: VoiceUiCaptionsInput): string {
  if (v.phase === 'connecting') return 'Conectando';
  if (v.phase === 'error') return 'Algo deu errado';
  if (!v.isConnected) return 'Aguarde';
  if (v.turnVisual === 'user-speaking') return 'Ouvindo você...';
  if (v.turnVisual === 'thinking') return 'Kiki está pensando';
  if (v.turnVisual === 'kiki-speaking') return 'Kiki está falando';
  return 'Toque para silenciar ou ativar o microfone';
}

export function voiceCenterSecondary(v: VoiceUiCaptionsInput): string {
  if (v.phase === 'connecting') return 'Preparando áudio...';
  if (v.phase === 'error') return 'Encerre e tente novamente.';
  if (!v.isConnected) return 'Estabelecendo chamada...';
  if (v.turnVisual === 'user-speaking') {
    const u = truncate(v.userTranscript ?? '', 140);
    return u || 'Continue falando naturalmente';
  }
  if (v.turnVisual === 'thinking') {
    return 'Aguarde enquanto a resposta é gerada';
  }
  if (v.turnVisual === 'kiki-speaking') {
    const a = truncate(v.agentTranscript ?? '', 160);
    return a || 'Aguarde a resposta em voz';
  }
  return 'O microfone fica ligado na chamada';
}
