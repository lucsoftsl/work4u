import {
  Briefcase, ClipboardList, Home, MessageSquare, PlusCircle, Search, Users, Wrench, type LucideIcon,
} from "lucide-react";
import type { ViewMode } from "@/hooks/useAccountMode";

export type NavItem = { href: string; labelKey: string; shortKey: string; icon: LucideIcon };

// Mode-aware navigation (design-tokens §5.6). Header shows the first four; the mobile tab bar shows all five.
export const NAV: Record<ViewMode, readonly NavItem[]> = {
  hiring: [
    { href: "/dashboard", labelKey: "nav.home", shortKey: "nav.home", icon: Home },
    { href: "/post-job", labelKey: "nav.postJob", shortKey: "nav.post", icon: PlusCircle },
    { href: "/my-jobs", labelKey: "nav.myJobs", shortKey: "nav.tabMyJobs", icon: Briefcase },
    { href: "/workers", labelKey: "nav.findWorkers", shortKey: "nav.tabWorkers", icon: Users },
    { href: "/chat", labelKey: "nav.messages", shortKey: "nav.messages", icon: MessageSquare },
  ],
  working: [
    { href: "/dashboard", labelKey: "nav.home", shortKey: "nav.home", icon: Home },
    { href: "/jobs", labelKey: "nav.findJobs", shortKey: "nav.tabFindJobs", icon: Search },
    { href: "/my-applications", labelKey: "nav.myApplications", shortKey: "nav.applied", icon: ClipboardList },
    { href: "/my-listings", labelKey: "nav.myServices", shortKey: "nav.tabServices", icon: Wrench },
    { href: "/chat", labelKey: "nav.messages", shortKey: "nav.messages", icon: MessageSquare },
  ],
};

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Routes that render their own chrome (auth screens, full-bleed map). */
export function isChromeless(pathname: string): boolean {
  return (
    pathname.startsWith("/signin") || pathname.startsWith("/signup") || pathname.endsWith("/nearby-pros") ||
    // B2B areas render their own shells (ops console, field app)
    pathname === "/ops" || pathname.startsWith("/ops/") || pathname === "/tech" || pathname.startsWith("/tech/")
  );
}
