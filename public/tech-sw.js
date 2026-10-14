/* Field app service worker (scope /tech). Keeps the app shell openable offline.
 * It never stores API responses: today's jobs live in IndexedDB (cleared on sign-out), not in a shared cache. */
const VERSION = "v3";
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

// The page also asks for the screens a technician needs when reopening the app with no connection (Today, Sync), even when the
// last full page load was a job screen (client-side navigation never stores a page copy). We fetch their HTML now, keep it, and
// keep the build files it references, so a cold offline open of /tech/:org/today shows the cached list, not an endless "Loading…".
const PAGE_PATH = /^\/tech(\/[A-Za-z0-9_-]+\/(today|sync))?$/;
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "cache-pages" || !Array.isArray(event.data.paths)) return;
  const paths = event.data.paths.filter((p) => typeof p === "string" && PAGE_PATH.test(p)).slice(0, 4);
  event.waitUntil(Promise.all(paths.map(async (path) => {
    try {
      const res = await fetch(path, { credentials: "same-origin", headers: { Accept: "text/html" } });
      if (!res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return;
      const html = await res.clone().text();
      await (await caches.open(SHELL)).put(path, res);
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+\.(?:js|css)/g) || [])].slice(0, 80);
      const statics = await caches.open(STATIC);
      await Promise.all(assets.map(async (u) => {
        if (await statics.match(u)) return;
        try { const r = await fetch(u); if (r.ok) await statics.put(u, r); } catch { /* offline: next time */ }
      }));
    } catch { /* offline: the copy from the last visit stays */ }
  })));
});
