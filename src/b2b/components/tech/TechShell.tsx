"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, CalendarCheck, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { useOffline } from "@/b2b/offline/OfflineProvider";
import { statusBarView, type BarView } from "@/b2b/offline/status-bar";
import { useStorage } from "@/b2b/offline/useStorage";
import { useOnline } from "@/b2b/offline/useOnline";
import { formatClock } from "@/b2b/lib/tz-format";
import { cn } from "@/lib/utils";
import { splitRoute } from "@/b2b/lib/split";
import { JobListPane } from "./JobListPane";
import { useTranslation } from "@/lib/i18n";

export { useOnline };

const TONE: Record<BarView["tone"], string> = {
  ok: "text-sig-green-ink",
  syncing: "bg-sig-blue-tint text-sig-blue-ink",
  offline: "bg-sig-orange-tint text-sig-orange-ink outline outline-2 -outline-offset-2 outline-sig-orange-ink",
  attention: "bg-sig-vermilion-tint text-sig-vermilion-ink",
  warning: "bg-sig-orange-tint text-sig-orange-ink",
};

const Icon = ({ tone }: { tone: BarView["tone"] }) => {
  const cls = "h-4 w-4 shrink-0";
  if (tone === "offline") return <CloudOff className={cls} aria-hidden="true" />;
  if (tone === "attention" || tone === "warning") return <AlertTriangle className={cls} aria-hidden="true" />;
  if (tone === "syncing") return <RefreshCw className={cn(cls, "motion-safe:animate-spin")} aria-hidden="true" />;
  return <Cloud className={cls} aria-hidden="true" />;
};

/** Mobile-first field app shell: sync status bar (a link to the Sync tab), content, bottom tabs. */
export function TechShell({ children }: { children: ReactNode }) {
  const { t, locale } = useTranslation();
  const { orgId, me } = useOrg();
  const { online, syncState, waitingCount, attention, lastSync } = useOffline();
  const storage = useStorage();
  const pathname = usePathname();
  const tz = me?.org.timezone ?? "UTC";
  const todayHref = `/tech/${orgId}/today`;
  const syncHref = `/tech/${orgId}/sync`;
  const badge = waitingCount + attention.length;
  const split = splitRoute(pathname, orgId).isSplit;
  const bar = statusBarView({ online, syncState, waitingCount, attentionCount: attention.length, lastSync, storageLow: !!storage?.low, locale, clock: (iso) => formatClock(iso, tz, locale), t });

  const tab = (href: string, active: boolean) => cn("relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-bold", active ? "text-ops-accent" : "text-ops-ink-muted");

  return (
    <div className={cn("flex min-h-[100dvh] flex-col bg-ops-canvas font-body text-ops-ink", split && "md:h-[100dvh] md:overflow-hidden")}>
      <a href={split ? "#tech-list" : "#tech-main"} className="sr-only-focusable fixed left-3 top-3 z-[100] rounded bg-white px-3 py-2 text-sm font-bold">{t("b2b.tech.skipToContent", "Skip to content")}</a>
      {split ? <a href="#tech-main" className="sr-only-focusable fixed left-3 top-14 z-[100] rounded bg-white px-3 py-2 text-sm font-bold">{t("b2b.tech.split.skipToJob", "Skip to job")}</a> : null}
      <header className="sticky top-0 z-30 border-b border-ops-border bg-ops-surface">
        <div className={cn("mx-auto flex h-12 max-w-2xl items-center justify-between gap-3 px-4", split && "md:max-w-none")}>
          <Link href={syncHref} className={cn("inline-flex min-h-[44px] min-w-0 items-center gap-2 rounded px-2 text-sm font-bold", TONE[bar.tone])}>
            <Icon tone={bar.tone} /> <span className="truncate" role="status">{bar.text}</span>
          </Link>
          <span className="truncate text-sm text-ops-ink-muted">{me?.org.name}</span>
        </div>
        {!online ? (
          <p className="border-t border-sig-orange-ink/30 bg-sig-orange-tint px-4 py-2 text-center text-sm font-bold text-sig-orange-ink">
            {t("b2b.tech.keepWorking", "Keep working. We'll send your changes when you're back online.")}
          </p>
        ) : null}
      </header>

      {split ? (
        <div className="flex-1 md:grid md:min-h-0 md:grid-cols-[320px_minmax(0,1fr)] md:pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:grid-cols-[360px_minmax(0,1fr)]">
          <nav id="tech-list" tabIndex={-1} aria-label={t("b2b.tech.split.listLabel", "Today's jobs")} className="hidden overflow-y-auto overscroll-contain border-r-2 border-ops-border-strong bg-ops-surface md:block">
            <JobListPane />
          </nav>
          <section id="tech-main" tabIndex={-1} aria-label={t("b2b.tech.split.jobLabel", "Job details")} className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 focus:outline-none md:mx-0 md:max-w-none md:overflow-y-auto md:overscroll-contain md:pb-0">
            <div className="md:max-w-[720px]">{children}</div>
          </section>
        </div>
      ) : (
        <div id="tech-main" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4 focus:outline-none">{children}</div>
      )}

      <nav aria-label={t("b2b.tech.fieldApp", "Field app")} className="fixed inset-x-0 bottom-0 z-30 border-t border-ops-border bg-ops-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-2xl grid-cols-2">
          <li>
            <Link href={todayHref} aria-current={pathname.startsWith(todayHref) ? "page" : undefined} className={tab(todayHref, pathname.startsWith(todayHref))}>
              <CalendarCheck className="h-6 w-6" aria-hidden="true" /> {t("b2b.tech.tab.today", "Today")}
            </Link>
          </li>
          <li>
            <Link href={syncHref} aria-current={pathname.startsWith(syncHref) ? "page" : undefined} className={tab(syncHref, pathname.startsWith(syncHref))}>
              <RefreshCw className="h-6 w-6" aria-hidden="true" /> {t("b2b.tech.tab.sync", "Sync")}
              {badge > 0 ? <span className="absolute right-[28%] top-1.5 min-w-[20px] rounded-full bg-sig-orange-ink px-1.5 text-center text-xs text-white" aria-label={t("b2b.tech.badgeWaiting", "{n} waiting").replace("{n}", String(badge))}>{badge}</span> : null}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
