"use client";

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

const nameOf = (a: Assignment) => a.teamName ?? a.memberName ?? (a.teamId ? "Team" : "Technician");

function Assignments({ job }: { job: JobWorkspace }) {
  const { orgId, can } = useOrg();
  const toast = useToast();
  const { refresh } = useJobCache(orgId, job.id);
  const [target, setTarget] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => unassignJob(orgId, job.id, id),
    onSuccess: () => { toast.push({ message: "Assignment removed", tone: "success" }); setTarget(null); void refresh(); },
    onError: (e) => { setTarget(null); setError(describeB2bError(e).message); },
  });
  const list = job.assignments ?? [];
  return (
    <Card title="Assigned" icon={<Users className="h-4 w-4" aria-hidden="true" />}>
      {list.length === 0 ? <p className="text-sm text-ops-ink-muted">Nobody is assigned yet.</p> : (
        <ul className="divide-y divide-ops-border">
          {list.map((a) => (
            <li key={a.id} className="flex min-h-[44px] items-center justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0"><span className="font-bold text-ops-ink">{nameOf(a)}</span> <span className="text-ops-ink-muted">· {a.teamId ? "Team" : a.role === "LEAD" ? "Lead" : "Technician"}</span></span>
              {can("job.assign") ? (
                <button type="button" onClick={() => { setError(null); setTarget(a); }} className={btnClass("secondary", "px-3")} aria-label={`Remove ${nameOf(a)}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Remove</span>
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {error ? <div className="mt-3"><Banner tone="danger" role="alert">{error}</Banner></div> : null}
      <ConfirmBox open={!!target} title={`Remove ${target ? nameOf(target) : ""}?`} description="They will be told this job is no longer theirs." confirmLabel="Remove" loading={remove.isPending}
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
