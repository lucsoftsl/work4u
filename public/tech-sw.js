/* Field app service worker (scope /tech). Keeps the app shell openable offline.
 * It never stores API responses: today's jobs live in IndexedDB (cleared on sign-out), not in a shared cache. */
const VERSION = "v2";
const SHELL = `tech-shell-${VERSION}`;
const STATIC = `tech-static-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/tech", "/tech/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("tech-") && k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API calls go to another origin and are never cached

  // Hashed build assets never change: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/tech/icon-")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pages under /tech: network first, saved copy (or the /tech shell) when offline.
  if (req.mode === "navigate" && (url.pathname === "/tech" || url.pathname.startsWith("/tech/"))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/tech")) || Response.error()),
    );
  }
});

// The page tells us which build assets it has already loaded (they were fetched before this worker controlled it),
// so the next screens work with no connection. Only same-origin /_next/static files are accepted.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "cache-urls" || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((u) => typeof u === "string" && u.startsWith("/_next/static/") && u.length < 300);
  event.waitUntil(
    caches.open(STATIC).then((cache) => Promise.all(urls.map(async (u) => {
      if (await cache.match(u)) return;
      try { const res = await fetch(u); if (res.ok) await cache.put(u, res); } catch { /* offline: next time */ }
    }))),
  );
});
