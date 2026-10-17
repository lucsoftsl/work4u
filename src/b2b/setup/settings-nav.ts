import type { PermissionKey } from "@/b2b/lib/permissions";

type Can = (permission: PermissionKey) => boolean;

/** The first Company setup page a viewer can open: profile (everyone sees it, read-only without org.manage) → team → clients. */
export function firstSettingsPage(orgId: string, can: Can): string {
  const base = `/ops/${encodeURIComponent(orgId)}`;
  if (can("org.manage")) return `${base}/settings/profile`;
  if (can("member.view")) return `${base}/settings/team`;
  if (can("customer.view")) return `${base}/customers`;
  return `${base}/settings/profile`;
}
