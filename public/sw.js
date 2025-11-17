const CACHE = 'sweetsale-v1';
const OFFLINE = '/offline.html'; // optional, see note

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/',
      '/index.html',
      '/icons/icon-192.png',
      '/icons/icon-512.png'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  // try network first for pages, otherwise use cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

