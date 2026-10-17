"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Radio, Search, X } from "lucide-react";
import { B2B_SIGN_IN } from "@/lib/b2b-paths";
import { useAuth } from "@/context/AuthContext";
import { useOrg, type LiveState } from "@/b2b/context/OrgContext";
import { visibleNav } from "@/b2b/lib/nav";
import { OrgSwitcher } from "./OrgSwitcher";
import { NotificationsBell } from "./NotificationsPanel";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const LIVE_LABEL: Record<LiveState, string> = { connecting: "Connecting", live: "Live", polling: "Live (updates every 5 s)", offline: "Offline" };

function LiveIndicator({ state }: { state: LiveState }) {
  const ok = state === "live" || state === "polling";
  return (
    <span role="status" className="hidden h-8 items-center gap-2 rounded border border-white/20 px-2.5 text-xs font-bold text-white sm:inline-flex">
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", ok ? "bg-sig-green" : state === "offline" ? "bg-sig-vermilion" : "bg-sig-orange")} />
      {LIVE_LABEL[state]}
    </span>
  );
}

export function OpsShell({ children }: { children: ReactNode }) {
  const { orgId, can, live, me } = useOrg();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const nav = visibleNav(can);
  const initial = (user?.displayName?.trim()?.[0] || me?.member.displayName?.[0] || "?").toUpperCase();

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  const navLinks = (
    <ul className="space-y-1 px-3 py-4">
      {nav.map(({ section, label, labelKey, icon: Icon }) => {
        const href = `/ops/${orgId}/${section}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={section}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setDrawer(false)}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded px-3 text-sm font-bold transition-colors",
                active ? "bg-white/10 text-white shadow-[inset_3px_0_0_#56B4E9]" : "text-ops-chrome-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {t(labelKey, label)}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex min-h-screen max-w-full flex-col overflow-x-clip bg-ops-canvas font-body text-ops-ink">
      <a href="#ops-main" className="sr-only-focusable fixed left-3 top-3 z-[100] rounded bg-white px-3 py-2 text-sm font-bold text-ops-ink">Skip to content</a>

      <header className="sticky top-0 z-40 flex h-16 min-w-0 items-center gap-1 bg-ops-chrome px-2 text-white sm:gap-2 sm:px-3 md:gap-3 md:px-4">
        <button type="button" aria-label={drawer ? "Close menu" : "Open menu"} aria-expanded={drawer} onClick={() => setDrawer((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded hover:bg-white/10 lg:hidden">
          {drawer ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
        <Link href={`/ops/${orgId}/dashboard`} aria-label="work4u Ops" className="flex min-h-[44px] shrink-0 items-center gap-2 font-display text-base font-bold md:text-lg">
          <Radio className="h-5 w-5 text-sig-sky" aria-hidden="true" />
          <span className="hidden sm:inline">work4u Ops</span>
        </Link>
        <OrgSwitcher />
        <form
          role="search" aria-label="Search jobs"
          className="ml-2 hidden min-w-0 flex-1 md:block"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/ops/${orgId}/jobs${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
          }}
        >
          <label className="relative block">
            <span className="sr-only">Search jobs</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-chrome-muted" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs by number or title"
              className="h-11 w-full max-w-xl rounded border border-white/20 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-ops-chrome-muted focus:border-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </label>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
          <LiveIndicator state={live} />
          <NotificationsBell orgId={orgId} />
          <button type="button" onClick={() => void signOut().then(() => router.push(B2B_SIGN_IN))} aria-label="Sign out" title="Sign out" className="flex h-11 w-11 items-center justify-center rounded text-white hover:bg-white/10">
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <span aria-hidden="true" className="hidden h-9 w-9 items-center justify-center rounded bg-white/10 text-sm font-bold sm:flex">{initial}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside aria-label="Workspace" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto bg-ops-chrome lg:block">
          <nav aria-label="Main">{navLinks}</nav>
          <p className="px-6 pb-4 text-xs text-ops-chrome-muted">{me?.role.name}</p>
        </aside>

        {drawer ? (
          <div className="fixed inset-0 top-16 z-30 lg:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <div ref={drawerRef} className="relative h-full w-64 overflow-y-auto bg-ops-chrome">
              <nav aria-label="Main">{navLinks}</nav>
            </div>
          </div>
        ) : null}

        <main id="ops-main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
