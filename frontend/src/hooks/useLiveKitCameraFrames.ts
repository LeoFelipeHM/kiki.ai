import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const CAMERA_FRAME_INTERVAL_MS = 2000;
const CAMERA_FRAME_MAX_WIDTH = 320;
const CAMERA_FRAME_MAX_HEIGHT = 240;
const CAMERA_FRAME_JPEG_QUALITY = 0.46;
const CAMERA_FRAME_MAX_DATA_URL_CHARS = 12_000;

type FacingMode = 'user' | 'environment';

export type PublishCameraFrame = (
  dataUrl: string,
  facingMode: FacingMode,
) => Promise<boolean>;

export function useLiveKitCameraFrames(
  publishCameraFrame: PublishCameraFrame,
): {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isCameraActive: boolean;
  isCameraStarting: boolean;
  cameraFacingMode: FacingMode;
  cameraError: string | null;
  startCamera: (facingMode?: FacingMode) => Promise<void>;
  stopCamera: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
} {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const facingModeRef = useRef<FacingMode>('user');
  const publishRef = useRef(publishCameraFrame);
  publishRef.current = publishCameraFrame;

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<FacingMode>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const captureAndPublish = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current || video.readyState < 2) return;

    const scale = Math.min(
      CAMERA_FRAME_MAX_WIDTH / Math.max(video.videoWidth, 1),
      CAMERA_FRAME_MAX_HEIGHT / Math.max(video.videoHeight, 1),
      1,
    );
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dataUrl = '';
    let targetWidth = width;
    let targetHeight = height;
    let quality = CAMERA_FRAME_JPEG_QUALITY;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= CAMERA_FRAME_MAX_DATA_URL_CHARS) break;
      targetWidth = Math.max(120, Math.round(targetWidth * 0.75));
      targetHeight = Math.max(90, Math.round(targetHeight * 0.75));
      quality = Math.max(0.25, quality - 0.08);
    }

    if (dataUrl.length > CAMERA_FRAME_MAX_DATA_URL_CHARS) {
      console.debug('[voice-camera] frame skipped: payload too large', dataUrl.length);
      return;
    }
    await publishRef.current(dataUrl, facingModeRef.current).catch((err) => {
      console.debug('[voice-camera] frame publish failed', err);
    });
  }, []);

  const stopCamera = useCallback(() => {
    clearTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
  }, [clearTimer]);

  const startCamera = useCallback(
    async (facingMode: FacingMode = facingModeRef.current) => {
      if (isCameraStarting) return;
      setIsCameraStarting(true);
      setCameraError(null);
      clearTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: CAMERA_FRAME_MAX_WIDTH },
            height: { ideal: CAMERA_FRAME_MAX_HEIGHT },
          },
          audio: false,
        });
        streamRef.current = stream;
        facingModeRef.current = facingMode;
        setCameraFacingMode(facingMode);
        setIsCameraActive(true);

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }

        void captureAndPublish();
        timerRef.current = window.setInterval(() => {
          void captureAndPublish();
        }, CAMERA_FRAME_INTERVAL_MS);
      } catch {
        streamRef.current = null;
        setIsCameraActive(false);
        setCameraError('Permita o uso da câmera para enviar imagens à Kiki.');
      } finally {
        setIsCameraStarting(false);
      }
    },
    [captureAndPublish, clearTimer, isCameraStarting],
  );

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || !isCameraActive) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
  }, [isCameraActive]);

  useEffect(() => stopCamera, [stopCamera]);

  const toggleCamera = useCallback(() => {
    if (isCameraActive || isCameraStarting) {
      stopCamera();
      return;
    }
    void startCamera();
  }, [isCameraActive, isCameraStarting, startCamera, stopCamera]);

  const switchCamera = useCallback(async () => {
    const next = facingModeRef.current === 'user' ? 'environment' : 'user';
    await startCamera(next);
  }, [startCamera]);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    isCameraStarting,
    cameraFacingMode,
    cameraError,
    startCamera,
    stopCamera,
    toggleCamera,
    switchCamera,
  };
}
