"use client";

import Link from "next/link";
import {
  Activity, CalendarClock, CalendarDays, CircleCheck, CircleSlash, ClipboardCheck, Clock3, OctagonAlert, PackageSearch, UserX, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { BucketCounts, BucketKey } from "@/b2b/lib/dashboard";
import { bucketHref } from "@/b2b/lib/dashboard";
import { FAMILY_CLASSES, type Family } from "@/b2b/lib/status";

interface BucketDef { key: BucketKey; label: string; hint: string; icon: LucideIcon; family: Family }

const BUCKETS: readonly BucketDef[] = [
  { key: "live", label: "Live", hint: "Dispatched to blocked", icon: Activity, family: "sky" },
  { key: "scheduledToday", label: "Scheduled today", hint: "Starting today", icon: CalendarDays, family: "blue" },
  { key: "upcoming", label: "Upcoming", hint: "After today", icon: CalendarClock, family: "blue" },
  { key: "unassigned", label: "Unassigned", hint: "No team or technician", icon: UserX, family: "orange" },
  { key: "delayed", label: "Delayed", hint: "Past start or end time", icon: Clock3, family: "vermilion" },
  { key: "waitingParts", label: "Waiting for parts", hint: "On hold for materials", icon: PackageSearch, family: "orange" },
  { key: "review", label: "Needs review", hint: "Awaiting sign-off", icon: ClipboardCheck, family: "purple" },
  { key: "blocked", label: "Blocked", hint: "Needs a decision", icon: OctagonAlert, family: "vermilion" },
  { key: "completedToday", label: "Completed today", hint: "Finished since midnight", icon: CircleCheck, family: "green" },
  { key: "cancelled", label: "Cancelled today", hint: "Cancelled since midnight", icon: CircleSlash, family: "slate" },
];

interface Props {
  orgId: string;
  counts: BucketCounts | null; // null = first load (skeleton)
  cappedKeys: ReadonlySet<BucketKey>;
  now: Date;
  tz: string;
  canReview: boolean;
}

export function BucketCards({ orgId, counts, cappedKeys, now, tz, canReview }: Props) {
  const { t } = useTranslation();
  const defs = BUCKETS.filter((b) => b.key !== "review" || canReview);
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label={t("b2b.dashboard.buckets", "Job buckets")}>
      {defs.map((b) => {
        const Icon = b.icon;
        const label = t(`b2b.dashboard.bucket.${b.key}`, b.label);
        const n = counts?.[b.key];
        const text = n === undefined ? "" : `${n}${cappedKeys.has(b.key) ? "+" : ""}`;
        const alarming = n !== undefined && n > 0 && (b.key === "blocked" || b.key === "delayed");
        return (
          <li key={b.key}>
            <Link
              href={bucketHref(orgId, b.key, now, tz)}
              className={cn(
                "group flex min-h-[112px] flex-col justify-between rounded-lg border bg-ops-surface p-3 transition-colors hover:border-ops-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-ink motion-reduce:transition-none",
                alarming ? "border-sig-vermilion-ink" : "border-ops-border"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ops-ink">{label}</span>
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded", FAMILY_CLASSES[b.family].tint)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
              <span className="flex items-end justify-between gap-2">
                {counts ? (
                  <span className="font-mono text-3xl font-bold leading-none text-ops-ink" aria-label={`${text}${cappedKeys.has(b.key) ? " or more" : ""}`}>{text}</span>
                ) : (
                  <span className="h-[30px] w-12 animate-pulse rounded bg-ops-border motion-reduce:animate-none" role="status"><span className="sr-only">Loading</span></span>
                )}
                <span className="text-right text-xs text-ops-ink-muted">{t(`b2b.dashboard.bucketHint.${b.key}`, b.hint)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
