// Return-to-page handling for sign-in. Only same-origin paths are accepted (no open redirects).

const DEFAULT_AFTER_SIGN_IN = "/dashboard";
const AUTH_PAGES = ["/signin", "/signup"];

export function safeRedirectPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_SIGN_IN): string {
  if (!raw) return fallback;
  let value: string;
  try {
    value = decodeURIComponent(raw).trim();
  } catch {
    return fallback;
  }
  // Must be a local absolute path: "/x" but not "//evil.com" or "/\evil.com".
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  const pathOnly = value.split(/[?#]/)[0];
  if (AUTH_PAGES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) return fallback;
  return value;
}

export function signInPath(returnTo?: string | null): string {
  const target = returnTo ? safeRedirectPath(returnTo, "") : "";
  return target ? `/signin?redirect=${encodeURIComponent(target)}` : "/signin";
}

/** Current location as a return target (client only). */
export function currentPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

const STORE_KEY = "work4u.postAuthRedirect";

/** The `?redirect=` target of a URL if (and only if) it is a safe same-origin path; auth pages and look-alike hosts are refused. */
export function redirectFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get("redirect");
  if (!raw) return null;
  const safe = safeRedirectPath(raw, "");
  return safe || null;
}

function store(): Storage | null {
  try { return typeof window !== "undefined" ? window.sessionStorage : null; } catch { return null; }
}

/** Keep the target for the rest of this tab session (sign-up has several steps; the URL may change between them). */
export function rememberRedirect(target: string | null): void {
  if (target) store()?.setItem(STORE_KEY, target);
}

export function clearRememberedRedirect(): void {
  store()?.removeItem(STORE_KEY);
}

/**
 * Where to go after signing in or finishing sign-up: the URL's `?redirect=` if present, otherwise the one remembered earlier in
 * this session. Re-validated every time, so a tampered storage value can never become an open redirect.
 */
export function resolvePostAuthTarget(search: string): string | null {
  const fromUrl = redirectFromSearch(search);
  if (fromUrl) { rememberRedirect(fromUrl); return fromUrl; }
  const remembered = store()?.getItem(STORE_KEY);
  if (!remembered) return null;
  const safe = safeRedirectPath(remembered, "");
  if (!safe) clearRememberedRedirect();
  return safe || null;
}

/** `/signup` that keeps the post-auth target, so onboarding can hand the person back to where they were going. */
export function signUpPath(target?: string | null): string {
  const safe = target ? safeRedirectPath(target, "") : "";
  return safe ? `/signup?redirect=${encodeURIComponent(safe)}` : "/signup";
}
