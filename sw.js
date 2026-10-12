
const CACHE = 'innoval-field-visit-shell-v1.9.69';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

const APP_ORIGIN = self.location.origin;
const APP_SCOPE = new URL('./', self.location.href).pathname;

function isAppShell(url) {
  if (url.origin !== APP_ORIGIN) return false;
  return SHELL.some(path =>
    new URL(path, self.registration.scope).href === url.href
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith('innoval-field-visit-') &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Never intercept external APIs or Supabase requests.
  if (url.origin !== APP_ORIGIN) return;

  // Do not cache requests outside this application.
  if (!url.pathname.startsWith(APP_SCOPE)) return;

  // Only manage the application's static shell.
  if (!isAppShell(url)) return;

  // Network-first with offline fallback.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then(cache =>
              cache.put(request, copy)
            )
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error('Offline resource unavailable');
      })
  );
});

/* Web Push Notifications */
self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Innoval Field Visit',
      body: event.data
        ? event.data.text()
        : 'New update available.'
    };
  }

  const title = data.title || 'Innoval Field Visit';

  const options = {
    body: data.body || 'New update available.',
    icon: data.icon || './icon-192.png',
    badge: data.badge || './icon-192.png',
    data: {
      url: data.url || './'
    },
    tag: data.tag || 'innoval-update',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* Notification Click */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl =
    event.notification.data &&
    event.notification.data.url
      ? event.notification.data.url
      : './';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
