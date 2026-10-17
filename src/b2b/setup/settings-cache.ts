import type { CompanySettings } from "./api";

/**
 * Merges a settings response into the cached settings. The edit permission never comes from a write response (older APIs omit it):
 * it is kept from the cache, or taken from the viewer's role in the org context.
 */
export function mergeSettings(prev: CompanySettings | undefined, next: CompanySettings, canEditFromRole: boolean): CompanySettings {
  const canEdit = typeof next.canEdit === "boolean" ? next.canEdit : prev?.canEdit ?? canEditFromRole;
  return { ...prev, ...next, canEdit };
}
