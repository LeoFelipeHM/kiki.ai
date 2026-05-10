/**
 * Helpers para gerenciar a assinatura Web Push do navegador.
 *
 * Web Push exige Service Worker + HTTPS (ou localhost).
 */

import {
  fetchVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/services/push';

const SERVICE_WORKER_URL = '/sw.js';
const SERVICE_WORKER_SCOPE = '/';

export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/** Garante o registro do Service Worker e retorna o registration. */
export async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
  if (existing) return existing;
  return navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: SERVICE_WORKER_SCOPE,
  });
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await ensureServiceWorkerRegistered();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Subscreve no PushManager (usando a chave VAPID do backend) e registra
 * a inscrição no servidor. Retorna a `PushSubscription` resultante.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  const registration = await ensureServiceWorkerRegistered();
  if (!registration) return null;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const publicKey = await fetchVapidPublicKey();
    const keyBytes = urlBase64ToUint8Array(publicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength,
      ) as ArrayBuffer,
    });
  }

  await registerPushSubscription({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64Url(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64Url(subscription.getKey('auth')),
    },
    user_agent: navigator.userAgent,
  });

  return subscription;
}

/** Remove a inscrição local e do backend. Idempotente. */
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch {
    // ignora — vamos tentar remover do servidor de qualquer forma
  }
  try {
    await unregisterPushSubscription(endpoint);
  } catch {
    // ignora — sub no servidor pode já ter sido removida
  }
}
