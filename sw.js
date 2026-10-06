const CACHE = 'tti-v17-analytics';
const CORE = ['/', '/assets/style.css', '/assets/analytics.js', '/assets/events.js'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await Promise.allSettled(CORE.map(url => cache.add(url)));
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API responses must always come from Pages Functions/D1, never Cache Storage.
  if (url.pathname.startsWith('/api/')) return;

  // HTML/navigation: network first so menu pages always use the current deployment.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        const home = await caches.match('/');
        if (home) return home;
        return new Response('Offline. Please reconnect and try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // Static assets: cache first, then network. Never reject respondWith.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (err) {
      return new Response('', { status: 504 });
    }
  })());
});
