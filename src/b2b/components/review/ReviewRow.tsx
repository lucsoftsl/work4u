"use client";

import Link from "next/link";
import { Camera, RotateCcw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { ReviewQueueItem } from "@/b2b/api/review";
import { JobRef } from "@/b2b/components/StatusPill";
import { btnClass } from "@/b2b/components/workspace/ui";
import { formatAbsolute, formatWaiting, reviewActionVisibility, totalAttachments } from "@/b2b/lib/review";

interface Props {
  orgId: string;
  tz: string;
  item: ReviewQueueItem;
  can: (p: string) => boolean;
  busy: boolean;
  onApprove: () => void;
  onSendBack: () => void;
}

export function ReviewRow({ orgId, tz, item, can, busy, onApprove, onSendBack }: Props) {
  const { t } = useTranslation();
  const vis = reviewActionVisibility(can);
  const files = totalAttachments(item.attachmentCounts);
  const reopened = item.reopenedCount ?? 0;
  return (
    <li className="flex flex-col gap-3 rounded border border-ops-border bg-ops-surface p-4 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <JobRef reference={item.reference} />
          {reopened > 0 ? (
            <span className="inline-flex items-center gap-1 rounded bg-sig-orange-tint px-2 py-0.5 text-xs font-bold text-sig-orange-ink">
              <RotateCcw className="h-3 w-3" aria-hidden="true" />{t("b2b.review.reopened", "Sent back")} {reopened}×
            </span>
          ) : null}
        </div>
        <Link href={`/ops/${orgId}/jobs/${item.id}`} className="mt-1 block truncate font-bold text-ops-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-accent">
          {item.title}
        </Link>
        <p className="truncate text-sm text-ops-ink-muted">{[item.customerName, item.locationLabel].filter(Boolean).join(" · ") || "—"}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm lg:w-72">
        <div>
          <dt className="text-xs text-ops-ink-subtle">{t("b2b.review.waiting", "Waiting")}</dt>
          <dd className="font-bold">{formatWaiting(item.awaitingSince)}</dd>
          <dd className="text-xs text-ops-ink-muted">{t("b2b.review.since", "since")} {formatAbsolute(item.awaitingSince, tz)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ops-ink-subtle">{t("b2b.review.photos", "Files")}</dt>
          <dd className="inline-flex items-center gap-1 font-bold">
            <Camera className="h-4 w-4" aria-hidden="true" />
            {files === null ? <span title={t("b2b.review.countsPending", "File counts aren't available yet")}>—</span> : files}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Link href={`/ops/${encodeURIComponent(orgId)}/jobs/${encodeURIComponent(item.id)}`} className={btnClass("secondary")}>{t("b2b.review.evidence.report", "View completion report")}</Link>
        {vis.approve ? <button type="button" disabled={busy} onClick={onApprove} className={btnClass("primary")}>{t("b2b.review.approve", "Approve")}</button> : null}
        {vis.sendBack ? <button type="button" disabled={busy} onClick={onSendBack} className={btnClass("secondary")}>{t("b2b.review.sendBack", "Send back")}</button> : null}
      </div>
    </li>
  );
}
