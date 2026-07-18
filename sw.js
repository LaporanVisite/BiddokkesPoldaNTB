// ── Service Worker Biddokkes Polda NTB ──
const CACHE_NAME = 'biddokkes-v1';
const BASE = '/BiddokkesPoldaNTB';

// File yang di-cache untuk offline
const STATIC_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

// ── Install: cache semua file statis ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW: Beberapa file tidak bisa di-cache:', err);
      });
    })
  );
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

// ── Fetch: strategi Cache First untuk aset statis, Network First untuk API ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke Google Apps Script (API data)
  if (url.hostname === 'script.google.com' ||
      url.hostname === 'api.fonnte.com' ||
      url.hostname === 'api.cloudinary.com' ||
      url.hostname.includes('cloudinary.com')) {
    return; // Biarkan browser handle langsung
  }

  // Untuk aset statis: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Tidak ada di cache, ambil dari network
      return fetch(event.request).then((response) => {
        // Hanya cache response yang valid
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        // Simpan ke cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // Jika offline dan tidak ada cache, kembalikan halaman utama
        if (event.request.destination === 'document') {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});

// ── Push notification (untuk future use) ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
