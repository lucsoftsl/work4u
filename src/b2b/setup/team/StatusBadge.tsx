"use client";

import { CheckCircle2, CircleDashed, Mail, PauseCircle } from "lucide-react";
import { FAMILY_CLASSES } from "@/b2b/lib/status";
import { cn } from "@/lib/utils";
import { useTr } from "../i18n";
import { daysSince, type MemberBadge } from "./memberLogic";

const META = {
  active: { Icon: CheckCircle2, cls: FAMILY_CLASSES.green.tint },
  invited: { Icon: Mail, cls: FAMILY_CLASSES.blue.tint },
  planning: { Icon: CircleDashed, cls: cn(FAMILY_CLASSES.slate.outline, "border-dashed") },
  suspended: { Icon: PauseCircle, cls: FAMILY_CLASSES.orange.tint },
} as const;

/** Status badge: text + icon + shape (planning-only is dashed). The planning note is always visible text. */
export function StatusBadge({ badge, invitedAt }: { badge: MemberBadge; invitedAt?: string }) {
  const { tr } = useTr();
  const { Icon, cls } = META[badge];
  const label = {
    active: tr("b2b.team.status.active", "Active"),
    invited: tr("b2b.team.status.invited", "Invited"),
    planning: tr("b2b.team.status.planning", "Planning only"),
    suspended: tr("b2b.team.status.suspended", "Suspended"),
  }[badge];
  return (
    <div className="space-y-1">
      <span className={cn("inline-flex min-h-7 max-w-full items-center gap-1.5 rounded px-2 py-1 text-xs font-bold", cls)}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="whitespace-normal text-left">{label}</span>
      </span>
      {badge === "planning" && <p className="text-xs text-ops-ink-muted">{tr("b2b.team.status.planningNote", "No app login. Scheduled by the office.")}</p>}
      {badge === "invited" && invitedAt && <p className="text-xs text-ops-ink-muted">{tr("b2b.team.status.invitedAgo", "Invitation sent {n} days ago", { n: daysSince(invitedAt) })}</p>}
    </div>
  );
}
