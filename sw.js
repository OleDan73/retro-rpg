'use strict';
/* Michael's Quest service worker: makes the game installable and playable offline.
 * Strategy: precache the app shell on install; then network-first for same-origin
 * requests (so a new deploy shows up as soon as you're online), falling back to the
 * cache when offline. Bump VERSION when the list of files changes. */
const VERSION = 'v1';
const CACHE = `turnip-vale-${VERSION}`;
const SHELL = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'pwa.js',
  'manifest.webmanifest',
  'fonts/press-start-2p-latin.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('turnip-vale-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      throw err;
    }
  })());
});
