"use client";

import { useTranslation } from "@/lib/i18n";
import { usePersonName } from "@/b2b/lib/usePersonName";
import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { assignJob, checkAssignment, listTeams, qk, type AssignTarget } from "@/b2b/api/endpoints";
import type { Conflict, JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { listAssignableMembers, sk } from "@/b2b/setup/api";
import { assigneeGroups } from "@/b2b/lib/assignees";
import { describeB2bError, isValidReason, type DescribedError } from "@/b2b/lib/workspace";
import { ConflictList } from "./ConflictList";
import { Banner, btnClass, Card, ErrorRetry, fieldClass, ReasonField, Spinner } from "./ui";
import { useJobCache } from "./useJobCache";

const parseTarget = (key: string): AssignTarget | null => {
  const [kind, id] = key.split(":");
  if (!id) return null;
  return kind === "team" ? { teamId: id } : { memberId: id };
};

export function AssignmentPanel({ job }: { job: JobWorkspace }) {
  const { t: tx, locale } = useTranslation();
  const i18n = { t: tx, locale };
  const { orgId, can } = useOrg();
  const nameOf = usePersonName();
  const toast = useToast();
  const { refresh } = useJobCache(orgId, job.id);
  const selectId = useId();
  const [key, setKey] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<DescribedError | null>(null);
  const target = parseTarget(key);

  const teams = useQuery({ queryKey: qk.teams(orgId), queryFn: () => listTeams(orgId), staleTime: 60_000 });
  // Every ACTIVE member (planning-only and team-less people included). If this fails the team members still work.
  const people = useQuery({ queryKey: [...sk.membersAll(orgId), "assignable"] as const, queryFn: () => listAssignableMembers(orgId), staleTime: 60_000, retry: false });
  const check = useQuery({
    queryKey: [...qk.job(orgId, job.id), "assign-check", key, job.version] as const,
    queryFn: () => checkAssignment(orgId, job.id, target as AssignTarget),
    enabled: !!target,
    staleTime: 0,
  });

  const assign = useMutation({
    mutationFn: (override?: { reason: string }) => assignJob(orgId, job.id, target as AssignTarget, override),
    onSuccess: (res) => {
      toast.push({ message: res.conflictsOverridden ? tx("b2b.job.assign.doneOverride", "Assigned with a conflict override") : tx("b2b.job.assign.done", "Assigned"), tone: "success" });
      setKey(""); setReason(""); setError(null);
      void refresh();
    },
    onError: (e) => setError(describeB2bError(e, i18n)),
  });

  const groups = assigneeGroups(teams.data ?? [], people.data, tx("b2b.job.assign.noTeam", "No team"));
  const alreadyAssigned = new Set((job.assignments ?? []).flatMap((a) => [a.teamId, a.memberId].filter(Boolean) as string[]));

  const conflicts: Conflict[] = error?.conflicts?.length ? error.conflicts : check.data?.conflicts ?? [];
  const canOverride = !!check.data?.canOverride && can("dispatch.override_conflict");
  const hasConflicts = conflicts.length > 0;
  const checking = !!target && check.isFetching && !check.data;

  const submit = () => {
    setError(null);
    if (hasConflicts && canOverride) assign.mutate({ reason: reason.trim() });
    else assign.mutate(undefined);
  };
  const disabled = !target || checking || assign.isPending || (hasConflicts && !canOverride) || (hasConflicts && canOverride && !isValidReason(reason));

  return (
    <Card title={tx("b2b.job.assign.title", "Assign")} icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>
      {teams.isError ? <ErrorRetry message={tx("b2b.job.assign.teamsError", "Couldn't load teams.")} onRetry={() => void teams.refetch()} /> : (
        <div className="space-y-3">
          {!job.scheduledStart ? <Banner tone="info">{tx("b2b.job.assign.noWindow", "This job has no time window yet. Set one under Schedule before assigning.")}</Banner> : null}
          <div>
            <label htmlFor={selectId} className="mb-1 block text-sm font-bold text-ops-ink">{tx("b2b.job.assign.who", "Team or technician")}</label>
            <select id={selectId} value={key} disabled={teams.isPending || assign.isPending} onChange={(e) => { setKey(e.target.value); setError(null); setReason(""); }} className={`${fieldClass} min-h-[44px]`}>
              <option value="">{teams.isPending ? tx("b2b.common.loadingDots", "Loading…") : tx("b2b.job.assign.choose", "Choose…")}</option>
              <optgroup label={tx("b2b.job.assign.teams", "Teams")}>
                {(teams.data ?? []).filter((t) => t.active).map((t) => <option key={t.id} value={`team:${t.id}`} disabled={alreadyAssigned.has(t.id)}>{t.name}{alreadyAssigned.has(t.id) ? ` ${tx("b2b.job.assign.assigned", "(assigned)")}` : ""}</option>)}
              </optgroup>
              {groups.map((g) => (
                <optgroup key={g.key} label={g.label ? tx("b2b.job.assign.techGroup", "Technicians · {group}").replace("{group}", g.label) : tx("b2b.job.assign.techs", "Technicians")}>
                  {g.members.map((m) => <option key={m.id} value={`member:${m.id}`} disabled={alreadyAssigned.has(m.id)}>{nameOf(m.displayName)}{m.loginStatus === "NONE" ? ` ${tx("b2b.job.assign.planningOnly", "(planning only)")}` : ""}{alreadyAssigned.has(m.id) ? ` ${tx("b2b.job.assign.assigned", "(assigned)")}` : ""}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          {checking ? <Spinner label={tx("b2b.job.assign.checking", "Checking availability…")} /> : null}
          {check.isError && !error ? <Banner tone="warning" role="alert">{tx("b2b.job.assign.checkFailed", "Couldn't check for conflicts.")} {describeB2bError(check.error, i18n).message}</Banner> : null}
          {target && check.data && !hasConflicts && !error ? <p role="status" className="text-sm text-sig-green-ink">{tx("b2b.job.assign.noConflicts", "No conflicts found.")}</p> : null}
          <ConflictList conflicts={conflicts} />
          {hasConflicts && !canOverride ? <p className="text-sm text-ops-ink-muted">{tx("b2b.job.assign.cannotOverride", "Your role can't override conflicts. Choose someone else or change the time.")}</p> : null}
          {hasConflicts && canOverride ? (
            <ReasonField label={tx("b2b.job.assign.overrideReason", "Override reason")} value={reason} onChange={setReason} disabled={assign.isPending} hint={tx("b2b.job.assign.overrideHint", "Required to assign anyway. Admins are notified and the reason is logged.")} />
          ) : null}
          {error && !error.conflicts?.length ? <Banner tone="danger" role="alert">{error.message}</Banner> : null}
          <button type="button" disabled={disabled} aria-busy={assign.isPending || undefined} onClick={submit} className={btnClass(hasConflicts && canOverride ? "danger" : "primary")}>
            {hasConflicts && canOverride ? tx("b2b.job.assign.anyway", "Assign anyway") : tx("b2b.job.assign.title", "Assign")}
          </button>
        </div>
      )}
    </Card>
  );
}
