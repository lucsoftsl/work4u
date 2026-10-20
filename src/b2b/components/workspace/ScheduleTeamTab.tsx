"use client";

import { useTranslation } from "@/lib/i18n";
import { personName } from "@/b2b/lib/person";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trash2, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { unassignJob } from "@/b2b/api/endpoints";
import type { Assignment, JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { describeB2bError } from "@/b2b/lib/workspace";
import { AssignmentPanel } from "./AssignmentPanel";
import { ScheduleForm } from "./ScheduleForm";
import { Banner, btnClass, Card, ConfirmBox } from "./ui";
import { useJobCache } from "./useJobCache";

const nameOf = (a: Assignment, t: (k: string, f: string) => string) => a.teamName ?? (a.teamId ? t("b2b.job.sched.team", "Team") : personName(a.memberName, t("b2b.member.unnamed", "Team member")));

function Assignments({ job }: { job: JobWorkspace }) {
  const { t: tx, locale } = useTranslation();
  const i18n = { t: tx, locale };
  const { orgId, can } = useOrg();
  const toast = useToast();
  const { refresh } = useJobCache(orgId, job.id);
  const [target, setTarget] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => unassignJob(orgId, job.id, id),
    onSuccess: () => { toast.push({ message: tx("b2b.job.sched.removed", "Assignment removed"), tone: "success" }); setTarget(null); void refresh(); },
    onError: (e) => { setTarget(null); setError(describeB2bError(e, i18n).message); },
  });
  const list = job.assignments ?? [];
  return (
    <Card title={tx("b2b.job.sched.assigned", "Assigned")} icon={<Users className="h-4 w-4" aria-hidden="true" />}>
      {list.length === 0 ? <p className="text-sm text-ops-ink-muted">{tx("b2b.job.sched.nobody", "Nobody is assigned yet.")}</p> : (
        <ul className="divide-y divide-ops-border">
          {list.map((a) => (
            <li key={a.id} className="flex min-h-[44px] items-center justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0"><span className="font-bold text-ops-ink">{nameOf(a, tx)}</span> <span className="text-ops-ink-muted">· {a.teamId ? tx("b2b.job.sched.team", "Team") : a.role === "LEAD" ? tx("b2b.job.sched.lead", "Lead") : tx("b2b.job.sched.technician", "Technician")}</span></span>
              {can("job.assign") ? (
                <button type="button" onClick={() => { setError(null); setTarget(a); }} className={btnClass("secondary", "px-3")} aria-label={tx("b2b.job.sched.removeNamed", "Remove {name}").replace("{name}", nameOf(a, tx))}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{tx("b2b.job.sched.remove", "Remove")}</span>
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {error ? <div className="mt-3"><Banner tone="danger" role="alert">{error}</Banner></div> : null}
      <ConfirmBox open={!!target} title={tx("b2b.job.sched.removeAsk", "Remove {name}?").replace("{name}", target ? nameOf(target, tx) : "")} description={tx("b2b.job.sched.removeBody", "They will be told this job is no longer theirs.")} confirmLabel={tx("b2b.job.sched.remove", "Remove")} loading={remove.isPending}
        onConfirm={() => target && remove.mutate(target.id)} onCancel={() => setTarget(null)} />
    </Card>
  );
}

export function ScheduleTeamTab({ job, timezone }: { job: JobWorkspace; timezone: string }) {
  const { can } = useOrg();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <ScheduleForm key={`${job.scheduledStart}|${job.scheduledEnd}`} job={job} timezone={timezone} />
      </div>
      <div className="min-w-0 space-y-4">
        <Assignments job={job} />
        {can("job.assign") ? <AssignmentPanel job={job} /> : null}
      </div>
    </div>
  );
}
