'use strict';

const CACHE_VERSION = 'v3';
const CACHE_NAME = `pos-kasse-${CACHE_VERSION}`;
const RUNTIME_CACHE = `pos-kasse-runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/app.js',
  './js/db.js',
  './js/migration.js',
  './js/state.js',
  './js/router.js',
  './js/utils.js',
  './js/stats.js',
  './js/barcode.js',
  './js/demo-data.js',
  './js/ui/pin.js',
  './js/ui/kasse.js',
  './js/ui/produkte.js',
  './js/ui/lager.js',
  './js/ui/stock-form.js',
  './js/ui/wareneingang.js',
  './js/ui/warenausgang.js',
  './js/ui/inventur.js',
  './js/ui/bewegungen.js',
  './js/ui/historie.js',
  './js/ui/statistik.js',
  './js/ui/produkt-detail.js',
  './js/ui/bestellliste.js',
  './js/ui/einstellungen.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isCrossOrigin = url.origin !== self.location.origin;

  if (isCrossOrigin) {
    // Runtime cache-first for external assets (e.g. barcode scanner polyfill/wasm)
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // App shell: cache-first, fall back to network, fall back to cached index.html for navigations
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          return caches.match('./index.html');
        });
    })
  );
});
