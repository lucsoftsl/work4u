import { API_BASE_URL } from "@/lib/http";

/**
 * The API now returns an absolute `logoUrl` (use it as is). Older responses were relative (`/api/b2b/files/download?...`): only those
 * get the API base. The link is a 5-minute signed link, so callers re-read settings to refresh it.
 */
export function resolveLogoUrl(url: string | null | undefined, apiBase: string = API_BASE_URL): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return url.startsWith("/") ? `${apiBase.replace(/\/+$/, "")}${url}` : url;
}
