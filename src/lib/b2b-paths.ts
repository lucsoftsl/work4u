/**
 * One place for every URL that crosses the B2B / marketplace boundary, so moving the B2B site to its own host later is a config
 * change (NEXT_PUBLIC_B2B_ORIGIN) and not a search-and-replace. Same origin today: the helpers return relative paths.
 */

/** Origin of the B2B site, no trailing slash. Empty = same origin as the marketplace (the current setup). */
export const B2B_ORIGIN = (process.env.NEXT_PUBLIC_B2B_ORIGIN ?? "").trim().replace(/\/+$/, "");

/** Absolute URL on the B2B site when it has its own origin, otherwise the relative path. */
export const b2bUrl = (path: string): string => `${B2B_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

/** The public B2B home (marketing page). */
export const B2B_PUBLIC_HOME = "/field-service";
export const B2B_DEMO_PATH = "/field-service/demo";
export const B2B_SIGN_IN = "/ops/signin";
export const B2B_START = "/ops/start";
export const B2B_WORKSPACES = "/ops";

const isOpsPage = (p: string) => p === "/ops" || p.startsWith("/ops/");
/** Pages under /ops that are the sign-in / sign-up entrances (never valid as a return target). */
const isAuthEntrance = (p: string) => p === B2B_SIGN_IN || p.startsWith(`${B2B_SIGN_IN}/`) || p === B2B_START || p.startsWith(`${B2B_START}/`);
const INVITE = /^\/b2b\/invite\/[A-Za-z0-9_-]+$/;

/** True for the logged-in B2B app (office console, field app, invitation page). */
export function isB2bAppPath(pathname: string): boolean {
  const p = pathname.split(/[?#]/)[0];
  return isOpsPage(p) || p === "/tech" || p.startsWith("/tech/") || INVITE.test(p);
}

/**
 * Return-to-page allow-list for B2B sign-in: only the B2B app. Anything else (marketplace pages, other hosts, protocol-relative or
 * backslash tricks, the auth pages themselves) is refused, so `?redirect=` can never become an open redirect or a bridge to B2C.
 */
export function safeB2bRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value: string;
  try {
    value = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const pathOnly = value.split(/[?#]/)[0];
  if (isAuthEntrance(pathOnly) || !isB2bAppPath(pathOnly)) return null;
  return value;
}

const withRedirect = (base: string, target?: string | null) => {
  const safe = safeB2bRedirect(target);
  return safe ? `${base}?redirect=${encodeURIComponent(safe)}` : base;
};

export const b2bSignInPath = (returnTo?: string | null) => withRedirect(B2B_SIGN_IN, returnTo);
export const b2bSignUpPath = (returnTo?: string | null) => withRedirect(B2B_START, returnTo);

export interface OrgChoice { id: string; name: string; landing?: string | null }

/** `landing` comes from the API (`/me/orgs`); distrusted unless it is inside that org's B2B app. */
function landingOf(org: OrgChoice): string {
  const fallback = `/ops/${encodeURIComponent(org.id)}/dashboard`;
  const l = org.landing;
  return l && safeB2bRedirect(l) ? l : fallback;
}

/**
 * Where a person goes after B2B sign-in or sign-up:
 *  a safe `?redirect=` (invitation, deep link) → else their only workspace's landing (technicians → the field app, others → the
 *  dashboard, never the marketplace) → else the workspace chooser → else the company wizard (no workspace yet).
 */
export function afterSignInTarget(orgs: readonly OrgChoice[], redirect?: string | null): string {
  const safe = safeB2bRedirect(redirect);
  if (safe) return safe;
  if (orgs.length === 0) return B2B_START;
  if (orgs.length === 1) return landingOf(orgs[0]);
  return B2B_WORKSPACES;
}
