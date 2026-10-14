"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const WARM_DELAY_MS = 2500;

/** Screens worth having offline for the workspace in `pathname` (/tech/:org/...): Today and Sync. */
export function offlinePages(pathname: string | null): string[] {
  const m = pathname?.match(/^\/tech\/([A-Za-z0-9_-]+)(?:\/|$)/);
  return m ? [`/tech/${m[1]}/today`, `/tech/${m[1]}/sync`] : [];
}

/** Registers the field app's service worker (production only; it would fight hot reload in dev) and
 *  hands it the build assets the current screen loaded, so the next screens open offline too. */
export function ServiceWorkerRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/tech-sw.js", { scope: "/tech" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const timer = setTimeout(() => {
      void navigator.serviceWorker.ready.then((reg) => {
        const urls = performance.getEntriesByType("resource")
          .map((e) => new URL(e.name, location.href))
          .filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/"))
          .map((u) => u.pathname + u.search);
        reg.active?.postMessage({ type: "cache-urls", urls });
        // Online only: the copies must come from the server, and an offline fetch would just fail.
        if (navigator.onLine) reg.active?.postMessage({ type: "cache-pages", paths: offlinePages(pathname) });
      });
    }, WARM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
