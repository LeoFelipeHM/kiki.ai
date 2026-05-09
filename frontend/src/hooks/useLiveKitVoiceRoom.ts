import { useCallback, useRef, useState } from 'react';
import { Room, RoomEvent, ConnectionState, Track } from 'livekit-client';

import { fetchVoiceSession } from '@/services/voiceLivekit';

export type VoiceConnectionPhase = 'idle' | 'connecting' | 'connected' | 'error';

/** Estado visual da troca de falas (baseado em falantes ativos no quarto). */
export type VoiceTurnVisual = 'idle' | 'user-speaking' | 'kiki-speaking';

export function useLiveKitVoiceRoom() {
  const roomRef = useRef<Room | null>(null);
  const playbackUnlockCleanupRef = useRef<(() => void) | null>(null);
  const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [phase, setPhase] = useState<VoiceConnectionPhase>('idle');
  const [turnVisual, setTurnVisual] = useState<VoiceTurnVisual>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);

  const cleanupRemoteAudio = useCallback(() => {
    const map = remoteAudioElsRef.current;
    for (const el of map.values()) {
      try {
        el.pause();
      } catch {}
      try {
        el.srcObject = null;
      } catch {}
      try {
        el.remove();
      } catch {}
    }
    map.clear();
  }, []);

  const refreshSpeakingHint = useCallback((room: Room) => {
    const speakers = room.activeSpeakers;
    const local = room.localParticipant;
    const userTalking = speakers.some((s) => s.sid === local.sid);
    const agentTalking = speakers.some((s) => s.sid !== local.sid);
    if (agentTalking) setTurnVisual('kiki-speaking');
    else if (userTalking) setTurnVisual('user-speaking');
    else setTurnVisual('idle');
  }, []);

  const disconnect = useCallback(async () => {
    playbackUnlockCleanupRef.current?.();
    playbackUnlockCleanupRef.current = null;
    cleanupRemoteAudio();
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      await room.disconnect();
    }
    setPhase('idle');
    setTurnVisual('idle');
    setErrorMessage(null);
    setMicEnabled(true);
  }, []);

  const connect = useCallback(async () => {
    if (roomRef.current) return;

    setErrorMessage(null);
    setPhase('connecting');
    setTurnVisual('idle');

    let room: Room | undefined;
    try {
      room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      /**
       * Políticas de autoplay: em alguns browsers, `startAudio()` precisa acontecer dentro
       * do gesto do usuário que iniciou a chamada. Como `fetchVoiceSession()` tem `await`,
       * desbloqueamos o playback imediatamente após instanciar o Room.
       */
      void room.startAudio().catch((err) => {
        console.debug('[voice] startAudio() bloqueado (precisa de gesto do usuário?)', err);
      });

      room.on(RoomEvent.ActiveSpeakersChanged, () => refreshSpeakingHint(room));
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.debug('[voice] ConnectionStateChanged', state);
        if (state === ConnectionState.Connected) setPhase('connected');
        if (state === ConnectionState.Disconnected) {
          cleanupRemoteAudio();
          setPhase('idle');
          setTurnVisual('idle');
        }
      });

      /** Áudio remoto do agente fica mudo até ``startAudio()`` (política dos browsers). */
      const tryUnlockAgentPlayback = () => {
        void room.startAudio().catch(() => {
          /* novo gesto do usuário pode ser necessário em alguns browsers */
        });
      };

      const onRemoteAudioTrack = (
        track: Track,
        _pub: unknown,
        participant: { sid: string },
      ) => {
        if (participant.sid === room.localParticipant.sid) return;
        if (track.kind !== Track.Kind.Audio) return;
        const key = `${participant.sid}:${String((track as unknown as { sid?: string }).sid ?? 'audio')}`;
        console.debug('[voice] remote audio track subscribed', { participantSid: participant.sid, key });

        // Attach explícito: remove ambiguidade de autoplay/elementos internos.
        if (!remoteAudioElsRef.current.has(key)) {
          const el = document.createElement('audio');
          el.autoplay = true;
          el.playsInline = true;
          el.controls = false;
          el.muted = false;
          el.style.position = 'fixed';
          el.style.left = '-9999px';
          el.style.top = '-9999px';
          document.body.appendChild(el);

          try {
            // livekit-client: RemoteAudioTrack tem attach()
            (track as unknown as { attach: (element?: HTMLMediaElement) => void }).attach(el);
          } catch (err) {
            console.debug('[voice] track.attach failed', err);
          }

          remoteAudioElsRef.current.set(key, el);
        }

        tryUnlockAgentPlayback();
      };

      const onRemoteTrackUnsubscribed = (
        track: Track,
        _pub: unknown,
        participant: { sid: string },
      ) => {
        if (track.kind !== Track.Kind.Audio) return;
        const key = `${participant.sid}:${String((track as unknown as { sid?: string }).sid ?? 'audio')}`;
        const el = remoteAudioElsRef.current.get(key);
        if (!el) return;
        console.debug('[voice] remote audio track unsubscribed', { key });
        try {
          (track as unknown as { detach: (element?: HTMLMediaElement) => void }).detach(el);
        } catch {}
        try {
          el.pause();
        } catch {}
        try {
          el.remove();
        } catch {}
        remoteAudioElsRef.current.delete(key);
      };

      room.on(RoomEvent.TrackSubscribed, onRemoteAudioTrack);
      playbackUnlockCleanupRef.current = () => {
        room.off(RoomEvent.TrackSubscribed, onRemoteAudioTrack);
        room.off(RoomEvent.TrackUnsubscribed, onRemoteTrackUnsubscribed);
      };
      room.on(RoomEvent.TrackUnsubscribed, onRemoteTrackUnsubscribed);

      const session = await fetchVoiceSession();
      await room.connect(session.url, session.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicEnabled(true);
      tryUnlockAgentPlayback();

      roomRef.current = room;
      setPhase('connected');
      refreshSpeakingHint(room);
    } catch (e) {
      console.debug('[voice] connect failed', e);
      playbackUnlockCleanupRef.current?.();
      playbackUnlockCleanupRef.current = null;
      cleanupRemoteAudio();
      if (room) {
        await room.disconnect().catch(() => {});
      }
      roomRef.current = null;
      setPhase('error');
      const msg =
        e instanceof Error ? e.message : 'Não foi possível conectar à chamada de voz.';
      setErrorMessage(msg);
    }
  }, [cleanupRemoteAudio, refreshSpeakingHint]);

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const cur = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!cur);
    setMicEnabled(!cur);
  }, []);

  return {
    connect,
    disconnect,
    toggleMicrophone,
    phase,
    turnVisual,
    errorMessage,
    micEnabled,
    isConnected: phase === 'connected',
  };
}
