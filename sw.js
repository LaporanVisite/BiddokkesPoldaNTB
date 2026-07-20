// ── Service Worker Biddokkes Polda NTB ──
const CACHE_NAME = 'biddokkes-v3';
const BASE = '/BiddokkesPoldaNTB';

// ── Install ──
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate: hapus cache lama ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: Network First untuk index.html, Cache First untuk aset lain ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke API eksternal
  if (url.hostname === 'script.google.com' ||
      url.hostname === 'api.fonnte.com' ||
      url.hostname.includes('cloudinary.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    return;
  }

  // index.html → selalu ambil dari network (Network First)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Aset lain (icon, manifest, sw) → Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(BASE + '/index.html'));
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
