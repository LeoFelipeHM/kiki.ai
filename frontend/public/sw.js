/* eslint-env serviceworker */
/* global self, clients */

/**
 * Service Worker da Kiki — recebe pushes Web Push do backend e exibe
 * notificações nativas mesmo com a aba fechada.
 */

const APP_NAME = 'Kiki';
const DEFAULT_ICON = '/favicon.svg';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    try {
      payload = { title: APP_NAME, body: event.data ? event.data.text() : '' };
    } catch (_inner) {
      payload = {};
    }
  }

  const title = payload.title || APP_NAME;
  const options = {
    body: payload.body || '',
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_ICON,
    tag: payload.tag || undefined,
    data: {
      url: payload.url || '/',
      kind: payload.kind || 'reminder',
    },
    requireInteraction: payload.requireInteraction === true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            try {
              client.postMessage({ type: 'kiki:notification-click', url: targetUrl });
            } catch (_e) {
              // ignora postMessage indisponível
            }
            return;
          }
        } catch (_e) {
          // ignora cliente inválido
        }
      }
      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })(),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Quando o navegador rotaciona a subscription, avisa o app aberto para
  // que ele renove via API. Evita que pushes parem silenciosamente.
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        try {
          client.postMessage({ type: 'kiki:push-subscription-change' });
        } catch (_e) {
          // ignora
        }
      }
    })(),
  );
});
