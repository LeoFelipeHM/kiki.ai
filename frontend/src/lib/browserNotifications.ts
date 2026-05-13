/**
 * Wrapper sobre as APIs nativas do navegador (Notification, WebAudio, Vibration)
 * para envio de notificações in-app enquanto a aba estiver aberta.
 *
 * Notificações em background (com a aba fechada) exigem Service Worker + Push API
 * + backend Web Push, fora do escopo deste utilitário.
 */

export type BrowserNotificationKind =
  | 'reminder'
  | 'meeting'
  | 'task'
  | 'kiki_suggestion'
  | 'daily_summary'
  | 'weekly_report'
  | 'test';

export interface ShowBrowserNotificationOptions {
  title: string;
  body?: string;
  /** Identificador estável usado para deduplicar notificações repetidas. */
  tag?: string;
  /** Caminho do ícone exibido na notificação (default: favicon). */
  icon?: string;
  /** Tocar bipe curto via WebAudio. */
  withSound?: boolean;
  /** Emitir vibração (mobile). */
  withVibration?: boolean;
  /** Ação ao clicar na notificação. */
  onClick?: () => void;
  /** Tempo em ms até fechar automaticamente (default 8000). 0 = não fechar. */
  autoCloseMs?: number;
}

export function isNotificationApiSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.Notification !== 'undefined';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationApiSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!isNotificationApiSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Bipe curto (~120ms) via WebAudio — não exige nenhum asset adicional. */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.start(now);
    osc.stop(now + 0.34);
    osc.onended = () => {
      void ctx.close().catch(() => undefined);
    };
  } catch {
    // ignora — usuário não interagiu ainda, browser bloqueia AudioContext
  }
}

export function vibrate(pattern: number | number[] = [120, 60, 120]): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(pattern);
    } catch {
      // ignora
    }
  }
}

/**
 * Exibe a notificação no navegador. Requer permissão "granted".
 * Retorna a instância (ou `null` quando não foi possível exibir).
 */
export function showBrowserNotification(opts: ShowBrowserNotificationOptions): Notification | null {
  if (!isNotificationApiSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  const {
    title,
    body,
    tag,
    icon = '/favicon-32x32.png',
    withSound,
    withVibration,
    onClick,
    autoCloseMs = 8000,
  } = opts;

  let notification: Notification;
  try {
    notification = new Notification(title, {
      body,
      tag,
      icon,
      silent: withSound ? false : undefined,
    });
  } catch {
    return null;
  }

  if (onClick) {
    notification.onclick = (event) => {
      event.preventDefault();
      try {
        window.focus();
      } catch {
        // ignora
      }
      try {
        onClick();
      } catch {
        // ignora
      }
      notification.close();
    };
  }

  if (withSound) playNotificationSound();
  if (withVibration) vibrate();

  if (autoCloseMs > 0) {
    window.setTimeout(() => {
      try {
        notification.close();
      } catch {
        // ignora
      }
    }, autoCloseMs);
  }

  return notification;
}
