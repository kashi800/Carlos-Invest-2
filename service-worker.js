/* Calculadora do Carlos - Offline-first PWA Service Worker (v3) */
const CACHE_NAME = "calc-carlos-v3";

/* Arquivos essenciais para funcionar offline. O service worker tenta cachear
   tudo na instalação. Se algum falhar, ainda assim continua. */
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/carlos-invest-logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache cada URL individualmente, ignorando falhas
      await Promise.all(
        PRECACHE_URLS.map((u) =>
          cache.add(u).catch((err) => console.warn("SW cache fail:", u, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Network-first para navegação (HTML) - fallback para cache offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("/index.html"))
        )
    );
    return;
  }

  // Cache-first para assets estáticos (JS, CSS, imagens, fontes)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Atualiza em background ("stale-while-revalidate")
        fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
