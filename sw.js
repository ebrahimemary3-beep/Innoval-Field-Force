const CACHE = 'innoval-field-visit-v1.9.31';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();

        caches.open(CACHE).then(cache => {
          cache.put(event.request, copy);
        });

        return response;
      })
      .catch(() => caches.match(event.request))
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
      body: event.data ? event.data.text() : 'New update available.'
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
