// Офлайн-режим каталога: страницы и данные — сначала сеть, фото — из кэша. Видео не кэшируются.
const CACHE = 'dubai-villas-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || /\/videos\//.test(url.pathname)) return;
  if (/\/(gallery|assets|vendor|materials)\//.test(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }));
    return;
  }
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request).then((hit) => hit || caches.match(request, { ignoreSearch: true }))));
});
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'precache' || !Array.isArray(data.urls)) return;
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    let done = 0;
    for (const url of data.urls) {
      try {
        if (!(await cache.match(url))) {
          const response = await fetch(url);
          if (response.ok) await cache.put(url, response);
        }
      } catch {}
      done += 1;
      if (done % 25 === 0 || done === data.urls.length) {
        for (const client of await self.clients.matchAll()) client.postMessage({ type: 'precache-progress', done, total: data.urls.length });
      }
    }
  }));
});
