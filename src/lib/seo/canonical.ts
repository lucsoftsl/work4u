/**
 * Old / stale URLs keep working: `/jobs/123`, `/jobs/old-title-123` and `/jobs/new-title-123` all resolve, and the
 * page answers 308 to `/jobs/{canonicalPath}`. Returns the path to redirect to, or null when already canonical.
 */
export function canonicalRedirectPath(basePath: string, requested: string, canonicalPath: string): string | null {
  let decoded = requested;
  try { decoded = decodeURIComponent(requested); } catch { /* keep raw */ }
  return decoded === canonicalPath ? null : `${basePath}/${canonicalPath}`;
}
