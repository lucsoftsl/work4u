interface Replaceable { replace: (url: string, opts?: { scroll?: boolean }) => void }

/**
 * Put new filters/period into the URL without leaving the page. Online that is `router.replace`. Offline the router would ask the server
 * for the new URL, the request fails and the browser falls back to its own error page; here the page is already loaded and only the
 * query changes, so the address bar is updated with history.replaceState (Next syncs useSearchParams with it) and the cached figures
 * stay on screen with the offline notice.
 */
export function replaceQuery(router: Replaceable, url: string): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    window.history.replaceState(window.history.state, "", url);
    return;
  }
  router.replace(url, { scroll: false });
}
