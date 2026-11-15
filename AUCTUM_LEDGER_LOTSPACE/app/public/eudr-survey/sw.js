// Service Worker for 100% Offline-First EUDR Field Plot Surveyor
const CACHE_NAME = 'auctum-eudr-survey-v1';
const ASSETS_TO_CACHE = [
  '/eudr-survey/index.html',
  '/eudr-survey/manifest.json',
  '/brand/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Offline-first strategy for app shell
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/eudr-survey/index.html');
          }
        });
      })
    );
  }
});
