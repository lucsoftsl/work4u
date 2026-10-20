"use client";

import { useTranslation } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { Bot, Eye, History, Lock, User, Users, type LucideIcon } from "lucide-react";
import type { TimelineEntry } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { actorName, describeTimelineEntry, formatInZone, groupByDay, normalizeCategory, type TimelineCategory } from "@/b2b/lib/workspace";
import { cn } from "@/lib/utils";
import { useTimeline } from "./queries";
import { btnClass, ErrorRetry, Skeleton, Spinner } from "./ui";

const CATEGORY: Record<TimelineCategory, { label: string; icon: LucideIcon }> = {
  CUSTOMER: { label: "Customer", icon: User },
  TEAM: { label: "Team", icon: Users },
  SYSTEM: { label: "System", icon: Bot },
  INTERNAL: { label: "Internal", icon: Lock },
};
const categoryText = (t: (k: string, f: string) => string, c: TimelineCategory) => t(`b2b.timeline.cat.${c}`, CATEGORY[c].label);

export function TimelineTab({ jobId, timezone }: { jobId: string; timezone: string }) {
  const { t, locale } = useTranslation();
  const i18n = { t, locale };
  const unnamed = t("b2b.member.unnamed", "Team member");
  const { orgId } = useOrg();
  const q = useTimeline(orgId, jobId);
  const { fetchNextPage, isFetchNextPageError } = q;
  const [hidden, setHidden] = useState<ReadonlySet<TimelineCategory>>(new Set());

  const entries = useMemo<TimelineEntry[]>(() => (q.data?.pages ?? []).flat(), [q.data]);
  const present = useMemo(() => (Object.keys(CATEGORY) as TimelineCategory[]).filter((c) => entries.some((e) => normalizeCategory(e.category) === c)), [entries]);
  const visible = useMemo(() => entries.filter((e) => !hidden.has(normalizeCategory(e.category))), [entries, hidden]);
  const groups = useMemo(() => groupByDay(visible, timezone), [visible, timezone]);

  if (q.isPending) return <div role="status" aria-busy="true" className="space-y-3"><span className="sr-only">{t("b2b.timeline.loading", "Loading timeline")}</span>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (q.isError) return <ErrorRetry message={t("b2b.timeline.loadError", "Couldn't load the timeline.")} onRetry={() => void q.refetch()} />;
  if (entries.length === 0) return <p className="rounded border border-dashed border-ops-border-strong bg-ops-surface p-6 text-center text-sm text-ops-ink-muted">{t("b2b.timeline.empty", "Nothing has happened on this job yet.")}</p>;

  const toggle = (c: TimelineCategory) => setHidden((prev) => { const next = new Set(prev); if (next.has(c)) next.delete(c); else next.add(c); return next; });

  return (
    <div className="space-y-4">
      {present.length > 1 ? (
        <div role="group" aria-label={t("b2b.timeline.filter", "Filter timeline by category")} className="flex flex-wrap gap-2">
          {present.map((c) => {
            const on = !hidden.has(c);
            const { icon: Icon } = CATEGORY[c];
            const label = categoryText(t, c);
            return (
              <button key={c} type="button" aria-pressed={on} onClick={() => toggle(c)}
                className={cn("inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-sm font-bold", on ? "border-ops-ink bg-ops-ink text-white" : "border-ops-border-strong bg-ops-surface text-ops-ink-muted")}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </button>
            );
          })}
        </div>
      ) : null}
      {groups.length === 0 ? <p className="text-sm text-ops-ink-muted">{t("b2b.timeline.allHidden", "All categories are hidden. Turn one back on.")}</p> : null}
      {groups.map((g) => (
        <section key={g.day} aria-label={formatInZone(g.items[0].occurredAt, timezone, { dateStyle: "full" }, locale)}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ops-ink-muted">{formatInZone(g.items[0].occurredAt, timezone, { dateStyle: "full" }, locale)}</h3>
          <ol className="space-y-2">
            {g.items.map((e) => {
              const cat = normalizeCategory(e.category);
              const { icon: Icon } = CATEGORY[cat];
              const label = categoryText(t, cat);
              const s = describeTimelineEntry(e, timezone, i18n);
              return (
                <li key={e.id} className={cn("flex gap-3 rounded border bg-ops-surface p-3", s.highlight ? "border-sig-orange-ink bg-sig-orange-tint" : "border-ops-border")}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ops-ink-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ops-ink"><strong>{actorName(e, unnamed, i18n)}</strong> · {s.text}</p>
                    {s.detail ? <p className={cn("mt-0.5 text-sm", s.highlight ? "font-bold text-sig-orange-ink" : "text-ops-ink-muted")}>{s.detail}</p> : null}
                    <p className="mt-0.5 text-xs text-ops-ink-muted"><span className="font-mono">{formatInZone(e.occurredAt, timezone, { timeStyle: "short" }, locale)}</span> · {label}{e.category === "INTERNAL" ? <Eye className="ml-1 inline h-3 w-3" aria-label={t("b2b.timeline.internalOnly", "Internal only")} /> : null}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {q.hasNextPage ? (
        <div className="flex justify-center">
          <button type="button" onClick={() => void fetchNextPage()} disabled={q.isFetchingNextPage} className={btnClass("secondary")}>
            {q.isFetchingNextPage ? <Spinner label={t("b2b.timeline.loadingMore", "Loading…")} /> : <><History className="h-4 w-4" aria-hidden="true" />{t("b2b.timeline.loadOlder", "Load older")}</>}
          </button>
        </div>
      ) : null}
      {isFetchNextPageError ? <ErrorRetry message={t("b2b.timeline.olderError", "Couldn't load older entries.")} onRetry={() => void fetchNextPage()} /> : null}
    </div>
  );
}
