import { Bell, Briefcase, ClipboardCheck, LayoutDashboard, Map, UserRound, Users, type LucideIcon } from "lucide-react";
import type { PermissionKey } from "./permissions";

export interface NavEntry { section: string; label: string; labelKey: string; icon: LucideIcon; permission: PermissionKey }

/** Spec §25 navigation. Only built sections appear; each is hidden when the role lacks the permission. */
export const OPS_NAV: readonly NavEntry[] = [
  { section: "dashboard", label: "Dashboard", labelKey: "b2b.nav.dashboard", icon: LayoutDashboard, permission: "job.view" },
  { section: "jobs", label: "Jobs", labelKey: "b2b.nav.jobs", icon: Briefcase, permission: "job.view" },
  { section: "dispatch", label: "Dispatch", labelKey: "b2b.nav.dispatch", icon: Map, permission: "dispatch.view" },
  { section: "review", label: "Review queue", labelKey: "b2b.nav.review", icon: ClipboardCheck, permission: "job.close" },
  { section: "teams", label: "Teams", labelKey: "b2b.nav.teams", icon: Users, permission: "team.view" },
  { section: "customers", label: "Customers", labelKey: "b2b.nav.customers", icon: UserRound, permission: "customer.view" },
  { section: "notifications", label: "Notifications", labelKey: "b2b.nav.notifications", icon: Bell, permission: "job.view" },
];

export function visibleNav(can: (p: PermissionKey) => boolean): NavEntry[] {
  return OPS_NAV.filter((entry) => can(entry.permission));
}
