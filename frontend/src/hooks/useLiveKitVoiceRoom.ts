import { useCallback, useRef, useState } from 'react';
import { Room, RoomEvent, ConnectionState, Track, type Participant } from 'livekit-client';

import { fetchVoiceSession } from '@/services/voiceLivekit';

export type VoiceConnectionPhase = 'idle' | 'connecting' | 'connected' | 'error';

/** Estado visual da troca de falas (lk.agent.state + falantes ativos). */
export type VoiceTurnVisual = 'idle' | 'user-speaking' | 'thinking' | 'kiki-speaking';

/** Estados publicados pelo agente em `participant.attributes['lk.agent.state']`. */
export type LkAgentState = 'idle' | 'initializing' | 'listening' | 'thinking' | 'speaking';

const TRANSCRIPTION_TOPIC = 'lk.transcription';
const CAMERA_FRAME_TOPIC = 'kiki.camera.frame';
const USER_SPEECH_CONFIRM_MS = 350;
const USER_SPEECH_RELEASE_MS = 180;

function parseAgentState(attrs: Readonly<Record<string, string>>): LkAgentState | null {
  const v = attrs['lk.agent.state'];
  if (
    v === 'idle' ||
    v === 'initializing' ||
    v === 'listening' ||
    v === 'thinking' ||
    v === 'speaking'
  ) {
    return v;
  }
  return null;
}

function findAgentParticipant(room: Room): Participant | undefined {
  if (room.localParticipant.isAgent) {
    return room.localParticipant;
  }
  for (const p of room.remoteParticipants.values()) {
    if (p.isAgent) return p;
  }
  return undefined;
}

function computeTurnVisual(
  room: Room,
  agentState: LkAgentState | null,
  userSpeakingConfirmed: boolean,
): VoiceTurnVisual {
  if (agentState === 'thinking') return 'thinking';
  if (agentState === 'speaking') return 'kiki-speaking';

  const speakers = room.activeSpeakers;
  const local = room.localParticipant;
  const userTalking = speakers.some((s) => s.sid === local.sid);
  const agentTalking = speakers.some((s) => s.sid !== local.sid);

  if (agentTalking) return 'kiki-speaking';
  if (userTalking && userSpeakingConfirmed) return 'user-speaking';
  return 'idle';
}

export function useLiveKitVoiceRoom() {
  const roomRef = useRef<Room | null>(null);
  const agentStateRef = useRef<LkAgentState | null>(null);
  const playbackUnlockCleanupRef = useRef<(() => void) | null>(null);
  const remoteAudioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const userSpeakingStartedAtRef = useRef<number | null>(null);
  const userSpeakingConfirmedRef = useRef(false);
  const userSpeechConfirmTimerRef = useRef<number | null>(null);
  const userSpeechReleaseTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<VoiceConnectionPhase>('idle');
  const [turnVisual, setTurnVisual] = useState<VoiceTurnVisual>('idle');
  const [agentState, setAgentState] = useState<LkAgentState | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentTranscript, setAgentTranscript] = useState('');
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

  const clearUserSpeechTimers = useCallback(() => {
    if (userSpeechConfirmTimerRef.current != null) {
      window.clearTimeout(userSpeechConfirmTimerRef.current);
      userSpeechConfirmTimerRef.current = null;
    }
    if (userSpeechReleaseTimerRef.current != null) {
      window.clearTimeout(userSpeechReleaseTimerRef.current);
      userSpeechReleaseTimerRef.current = null;
    }
  }, []);

  const refreshSpeakingHint = useCallback((room: Room) => {
    const agentParticipant = findAgentParticipant(room);
    const parsed = agentParticipant ? parseAgentState(agentParticipant.attributes) : null;
    if (parsed) {
      agentStateRef.current = parsed;
      setAgentState(parsed);
    }
    const effective = parsed ?? agentStateRef.current;
    const localTalking = room.activeSpeakers.some((s) => s.sid === room.localParticipant.sid);

    if (localTalking) {
      if (userSpeechReleaseTimerRef.current != null) {
        window.clearTimeout(userSpeechReleaseTimerRef.current);
        userSpeechReleaseTimerRef.current = null;
      }
      if (userSpeakingStartedAtRef.current == null) {
        userSpeakingStartedAtRef.current = performance.now();
      }
      const elapsed = performance.now() - userSpeakingStartedAtRef.current;
      if (elapsed >= USER_SPEECH_CONFIRM_MS) {
        userSpeakingConfirmedRef.current = true;
      } else if (userSpeechConfirmTimerRef.current == null) {
        userSpeechConfirmTimerRef.current = window.setTimeout(() => {
          userSpeechConfirmTimerRef.current = null;
          if (room.activeSpeakers.some((s) => s.sid === room.localParticipant.sid)) {
            userSpeakingConfirmedRef.current = true;
            setTurnVisual(computeTurnVisual(room, agentStateRef.current, true));
          }
        }, USER_SPEECH_CONFIRM_MS - elapsed);
      }
    } else {
      userSpeakingStartedAtRef.current = null;
      if (userSpeechConfirmTimerRef.current != null) {
        window.clearTimeout(userSpeechConfirmTimerRef.current);
        userSpeechConfirmTimerRef.current = null;
      }
      if (userSpeakingConfirmedRef.current && userSpeechReleaseTimerRef.current == null) {
        userSpeechReleaseTimerRef.current = window.setTimeout(() => {
          userSpeechReleaseTimerRef.current = null;
          userSpeakingConfirmedRef.current = false;
          setTurnVisual(computeTurnVisual(room, agentStateRef.current, false));
        }, USER_SPEECH_RELEASE_MS);
      } else if (!userSpeakingConfirmedRef.current) {
        userSpeakingConfirmedRef.current = false;
      }
    }

    setTurnVisual(computeTurnVisual(room, effective, userSpeakingConfirmedRef.current));
  }, []);

  const disconnect = useCallback(async () => {
    playbackUnlockCleanupRef.current?.();
    playbackUnlockCleanupRef.current = null;
    clearUserSpeechTimers();
    cleanupRemoteAudio();
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      await room.disconnect();
    }
    setPhase('idle');
    setTurnVisual('idle');
    setAgentState(null);
    agentStateRef.current = null;
    userSpeakingStartedAtRef.current = null;
    userSpeakingConfirmedRef.current = false;
    setUserTranscript('');
    setAgentTranscript('');
    setErrorMessage(null);
    setMicEnabled(true);
  }, [cleanupRemoteAudio, clearUserSpeechTimers]);

  const connect = useCallback(async () => {
    if (roomRef.current) return;

    setErrorMessage(null);
    setPhase('connecting');
    setTurnVisual('idle');
    setAgentState(null);
    agentStateRef.current = null;
    setUserTranscript('');
    setAgentTranscript('');

    let pendingRoom: Room | null = null;
    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      pendingRoom = room;

      /**
       * Políticas de autoplay: em alguns browsers, `startAudio()` precisa acontecer dentro
       * do gesto do usuário que iniciou a chamada. Como `fetchVoiceSession()` tem `await`,
       * desbloqueamos o playback imediatamente após instanciar o Room.
       */
      void room.startAudio().catch((err) => {
        console.debug('[voice] startAudio() bloqueado (precisa de gesto do usuário?)', err);
      });

      const onActiveSpeakersChanged = () => refreshSpeakingHint(room);

      const onParticipantOrAttributes = (participant: Participant) => {
        if (!participant.isAgent) return;
        const next = parseAgentState(participant.attributes);
        if (next) {
          agentStateRef.current = next;
          setAgentState(next);
          if (next === 'thinking') {
            setAgentTranscript('');
          }
        }
        refreshSpeakingHint(room);
      };

      const onParticipantConnected = (p: Participant) => onParticipantOrAttributes(p);
      const onParticipantAttributesChanged = (
        _changed: Record<string, string>,
        p: Participant,
      ) => onParticipantOrAttributes(p);

      room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);

      room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.on(RoomEvent.ParticipantAttributesChanged, onParticipantAttributesChanged);

      room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, async (reader, participantInfo) => {
        const r = roomRef.current;
        if (!r) return;
        const localId = r.localParticipant.identity;
        const isUserSpeech = participantInfo.identity === localId;
        try {
          for await (const chunk of reader) {
            if (isUserSpeech) {
              setUserTranscript(chunk);
            } else {
              setAgentTranscript(chunk);
            }
          }
        } catch (err) {
          console.debug('[voice] transcription stream ended', err);
        }
      });

      const onConnectionStateChanged = (state: ConnectionState) => {
        console.debug('[voice] ConnectionStateChanged', state);
        if (state === ConnectionState.Connected) setPhase('connected');
        if (state === ConnectionState.Disconnected) {
          cleanupRemoteAudio();
          clearUserSpeechTimers();
          setPhase('idle');
          setTurnVisual('idle');
          setAgentState(null);
          agentStateRef.current = null;
          userSpeakingStartedAtRef.current = null;
          userSpeakingConfirmedRef.current = false;
          setUserTranscript('');
          setAgentTranscript('');
        }
      };

      room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);

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
          el.setAttribute('playsinline', 'true');
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
        room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
        room.off(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
        room.off(RoomEvent.TrackSubscribed, onRemoteAudioTrack);
        room.off(RoomEvent.TrackUnsubscribed, onRemoteTrackUnsubscribed);
        room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
        room.off(RoomEvent.ParticipantAttributesChanged, onParticipantAttributesChanged);
        room.unregisterTextStreamHandler(TRANSCRIPTION_TOPIC);
        clearUserSpeechTimers();
      };
      room.on(RoomEvent.TrackUnsubscribed, onRemoteTrackUnsubscribed);

      const session = await fetchVoiceSession();
      await room.connect(session.url, session.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicEnabled(true);
      tryUnlockAgentPlayback();

      roomRef.current = room;
      setPhase('connected');
      for (const p of room.remoteParticipants.values()) {
        if (p.isAgent) onParticipantOrAttributes(p);
      }
    } catch (e) {
      console.debug('[voice] connect failed', e);
      playbackUnlockCleanupRef.current?.();
      playbackUnlockCleanupRef.current = null;
      clearUserSpeechTimers();
      cleanupRemoteAudio();
      if (pendingRoom) {
        await pendingRoom.disconnect().catch(() => {});
      }
      roomRef.current = null;
      setPhase('error');
      const msg =
        e instanceof Error ? e.message : 'Não foi possível conectar à chamada de voz.';
      setErrorMessage(msg);
    }
  }, [cleanupRemoteAudio, clearUserSpeechTimers, refreshSpeakingHint]);

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const cur = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!cur);
    setMicEnabled(!cur);
  }, []);

  const publishCameraFrame = useCallback(async (dataUrl: string, facingMode: 'user' | 'environment') => {
    const room = roomRef.current;
    if (!room || phase !== 'connected') return false;
    const payload = {
      type: 'camera_frame',
      image: dataUrl,
      mimeType: 'image/jpeg',
      facingMode,
      capturedAt: new Date().toISOString(),
    };
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(payload)),
      { reliable: true, topic: CAMERA_FRAME_TOPIC },
    );
    return true;
  }, [phase]);

  return {
    connect,
    disconnect,
    toggleMicrophone,
    publishCameraFrame,
    phase,
    turnVisual,
    agentState,
    userTranscript,
    agentTranscript,
    errorMessage,
    micEnabled,
    isConnected: phase === 'connected',
  };
}
