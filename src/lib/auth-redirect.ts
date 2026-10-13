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
