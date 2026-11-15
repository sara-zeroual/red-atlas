// RED ATLAS — service worker
// Stratégie : réseau d'abord pour le code (HTML/JS/CSS/JSON) afin que les mises
// à jour soient visibles immédiatement ; cache en secours hors-ligne.
// Images : cache d'abord (elles ne changent jamais).
const CACHE = "red-atlas-v11";
const ASSETS = [
  "./", "./index.html", "./style.css", "./atlas.js", "./data.js", "./manifest.json",
  "./img/erg_chebbi.jpg", "./img/tafilalet.jpg", "./img/agoudal.jpg",
  "./img/anti_atlas.jpg", "./img/mhamid.jpg", "./engine/engine.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isCode = /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith("/");

  if (isCode) {
    // réseau d'abord, cache en secours
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
  } else {
    // images : cache d'abord, réseau en secours
    e.respondWith(
      caches.match(e.request).then(hit => hit ||
        fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        }).catch(() => caches.match("./index.html"))
      )
    );
  }
});
