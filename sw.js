/* Carnet d'audit : service worker. L'app fonctionne hors ligne une fois ouverte une première fois. */
const VERSION = 'c86643b298';
const CACHE = 'carnet-audit-' + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-64.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./fonts/ibm-plex-mono-latin-500-normal.woff2",
  "./fonts/ibm-plex-sans-condensed-latin-600-normal.woff2",
  "./fonts/ibm-plex-sans-latin-400-normal.woff2",
  "./fonts/ibm-plex-sans-latin-500-normal.woff2",
  "./fonts/ibm-plex-sans-latin-600-normal.woff2",
  "./fonts/ibm-plex-sans-latin-700-normal.woff2"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('carnet-audit-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Page : réseau d'abord (pour recevoir les mises à jour), cache si pas de réseau ou réseau trop lent. */
async function page(request) {
  const cache = await caches.open(CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(request, { signal: controller.signal, cache: 'no-cache' });
    clearTimeout(timer);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch (e) {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(request));
    return;
  }
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    }))
  );
});
