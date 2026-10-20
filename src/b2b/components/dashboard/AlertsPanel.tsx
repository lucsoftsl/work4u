"use client";

import Link from "next/link";
import { CircleAlert, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { JobRef } from "@/b2b/components/StatusPill";
import { formatDateTime } from "@/b2b/components/jobs/format";
import type { AlertSeverity, DashboardAlert } from "@/b2b/lib/dashboard";
import { FAMILY_CLASSES } from "@/b2b/lib/status";
import { fmt } from "@/b2b/lib/plural";
import type { Translate } from "@/b2b/lib/plural";

const SEVERITY: Record<AlertSeverity, { label: string; icon: LucideIcon; cls: string }> = {
  critical: { label: "Critical", icon: OctagonAlert, cls: FAMILY_CLASSES.vermilion.solid },
  warning: { label: "Warning", icon: TriangleAlert, cls: FAMILY_CLASSES.orange.tint },
  info: { label: "Info", icon: CircleAlert, cls: FAMILY_CLASSES.blue.tint },
};

const MAX_VISIBLE = 8;

interface I18n { t: Translate; locale: string }

function message(a: DashboardAlert, tz: string, { t, locale }: Required<I18n>): string {
  const j = a.job;
  const time = (iso: string | null | undefined) => formatDateTime(iso, tz, locale);
  const why = j.statusReason ?? "";
  const lateEnd = j.status === "EN_ROUTE" || j.status === "IN_PROGRESS";
  switch (a.kind) {
    case "blocked":
      return why ? fmt(t("b2b.alert.blockedWhy", "Blocked: {reason}"), { reason: why }) : t("b2b.alert.blocked", "Blocked");
    case "running_late":
      return fmt(lateEnd ? t("b2b.alert.lateEnd", "Running late (planned end {time})") : t("b2b.alert.lateStart", "Running late (planned start {time})"), { time: time(a.at ? new Date(a.at).toISOString() : null) });
    case "waiting_parts":
      return why ? fmt(t("b2b.alert.partsWhy", "Waiting for parts: {reason}"), { reason: why }) : t("b2b.alert.parts", "Waiting for parts");
    case "sla_risk":
      return fmt(t("b2b.alert.sla", "SLA due {time}"), { time: time(j.slaDueAt) });
    case "unassigned_soon":
      return fmt(t("b2b.alert.unassigned", "No team assigned, starts {time}"), { time: time(j.scheduledStart) });
  }
}

interface Props {
  orgId: string;
  tz: string;
  alerts: DashboardAlert[] | null; // null = loading
  canDispatch: boolean;
}

export function AlertsPanel({ orgId, tz, alerts, canDispatch }: Props) {
  const { t, locale } = useTranslation();
  return (
    <section aria-labelledby="alerts-heading" className="rounded-lg border border-ops-border bg-ops-surface">
      <div className="flex items-center justify-between border-b border-ops-border px-4 py-3">
        <h2 id="alerts-heading" className="text-base font-bold text-ops-ink">{t("b2b.dashboard.alerts", "Alerts")}</h2>
        {alerts && <span className="font-mono text-xs text-ops-ink-muted">{alerts.length}</span>}
      </div>
      <div className="min-h-[280px]">
        {alerts === null ? (
          <ul role="status" aria-busy="true" className="divide-y divide-ops-border">
            <li className="sr-only">{t("b2b.common.loading", "Loading")}</li>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex min-h-[64px] items-center gap-3 px-4"><span className="h-6 w-24 animate-pulse rounded bg-ops-border motion-reduce:animate-none" /><span className="h-4 flex-1 animate-pulse rounded bg-ops-border motion-reduce:animate-none" /></li>
            ))}
          </ul>
        ) : alerts.length === 0 ? (
          <p className="p-6 text-sm text-ops-ink-muted">{t("b2b.dashboard.alertsEmpty", "Nothing needs attention right now.")}</p>
        ) : (
          <ul className="divide-y divide-ops-border">
            {alerts.slice(0, MAX_VISIBLE).map((a) => {
              const sev = SEVERITY[a.severity];
              const Icon = sev.icon;
              const open = `/ops/${orgId}/jobs/${a.job.id}`;
              const action = a.kind === "unassigned_soon" && canDispatch
                ? { href: `/ops/${orgId}/dispatch`, label: t("b2b.dashboard.openDispatch", "Open dispatch board") }
                : { href: open, label: t("b2b.dashboard.openJob", "Open job") };
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                  <span className={cn("inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-bold", sev.cls)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />{t(`b2b.alert.sev.${a.severity}`, sev.label)}
                  </span>
                  <Link href={open} className="inline-flex min-h-[44px] items-center"><JobRef reference={a.job.reference} /></Link>
                  <span className="min-w-0 flex-1 basis-48 text-sm text-ops-ink">
                    <span className="font-bold">{a.job.title}</span>
                    <span className="block text-ops-ink-muted">{message(a, tz, { t, locale })}</span>
                  </span>
                  <Link href={action.href} className="inline-flex min-h-[44px] items-center rounded px-3 text-sm font-bold text-ops-ink underline underline-offset-2 hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink">
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {alerts && alerts.length > MAX_VISIBLE && (
        <p className="border-t border-ops-border px-4 py-2 text-xs text-ops-ink-muted">{t("b2b.dashboard.moreAlerts", "+{n} more. Open the bucket cards above to see them all.").replace("{n}", String(alerts.length - MAX_VISIBLE))}</p>
      )}
    </section>
  );
}
