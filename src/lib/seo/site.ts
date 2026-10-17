/** Single place for the site's public identity. */
export const BRAND = "Work4U";
export const TAGLINE = "Local help and local work";
export const DEFAULT_DESCRIPTION = "Post a task and get help from people nearby, or find paid work that fits your skills.";

const DEFAULT_SITE_URL = "http://localhost:3000";

/** Canonical origin (no trailing slash). Set NEXT_PUBLIC_SITE_URL in production; the localhost fallback is only for dev. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");

export const absoluteUrl = (path: string): string => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;


/** Origin of the B2B public pages. Same as SITE_URL today; set NEXT_PUBLIC_B2B_ORIGIN when they move to their own host. */
export const B2B_SITE_URL = (process.env.NEXT_PUBLIC_B2B_ORIGIN || SITE_URL).trim().replace(/\/+$/, "");

export const b2bAbsoluteUrl = (path: string): string => `${B2B_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
