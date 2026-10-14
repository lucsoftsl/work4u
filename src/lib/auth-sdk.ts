import type { Auth } from "firebase/auth";

/**
 * The sign-in SDK (about 270 KB with its iframe/gapi helpers) is loaded on demand instead of being part of every page's
 * first-load bundle. Signed-in visitors (the `work4u_auth` hint cookie) load it immediately; anonymous visitors, crawlers and
 * Lighthouse load it only once the browser is idle, i.e. after the page has painted.
 */
export interface AuthSdk {
  auth: Auth;
  onIdTokenChanged: typeof import("firebase/auth").onIdTokenChanged;
  getAuthUserFromFirebaseUser: typeof import("./auth-service").getAuthUserFromFirebaseUser;
  signOut: typeof import("./auth-service").signOut;
}

let loading: Promise<AuthSdk> | null = null;

export function loadAuthSdk(): Promise<AuthSdk> {
  loading ??= Promise.all([import("firebase/auth"), import("./firebase"), import("./auth-service")])
    .then(([fa, fb, svc]) => ({ auth: fb.auth, onIdTokenChanged: fa.onIdTokenChanged, getAuthUserFromFirebaseUser: svc.getAuthUserFromFirebaseUser, signOut: svc.signOut }))
    .catch((error) => {
      loading = null; // a failed chunk load (offline) can be retried
      throw error;
    });
  return loading;
}

/** True when this browser has an app session (the non-secret UX cookie set at sign-in). */
export function hasSessionHint(): boolean {
  try {
    return /(?:^|;\s*)work4u_auth=1(?:;|$)/.test(document.cookie);
  } catch {
    return false;
  }
}

const IDLE_TIMEOUT_MS = 4000;

/** Run `fn` when the browser is idle (or after a short timeout where requestIdleCallback does not exist). Returns a cancel function. */
export function whenIdle(fn: () => void, timeout = IDLE_TIMEOUT_MS): () => void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, Math.min(timeout, 1500));
  return () => clearTimeout(id);
}
