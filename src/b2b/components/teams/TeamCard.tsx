"use client";

import { usePersonName } from "@/b2b/lib/usePersonName";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Star } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Team, TeamStatus } from "@/b2b/api/types";
import type { Skill } from "@/b2b/api/catalog-types";
import { setTeamStatus } from "@/b2b/api/catalog";
import { catalogErrorMessage, skillsByMember, type CatalogActions } from "@/b2b/lib/catalog";
import { TEAM_STATUS_LABEL } from "@/b2b/lib/status";
import { summarizeHours } from "@/b2b/lib/working-hours";
import { ErrorAlert, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { TeamStatusChip } from "./TeamStatusChip";
import { teamStatusLabel } from "@/b2b/lib/status-label";

const STATUSES = Object.keys(TEAM_STATUS_LABEL) as TeamStatus[];

export function TeamCard({ orgId, team, skills, actions, onEdit }: { orgId: string; team: Team; skills: Skill[]; actions: CatalogActions; onEdit: (t: Team) => void }) {
  const { t } = useTranslation();
  const nameOf = usePersonName();
  const qc = useQueryClient();
  const [status, setStatus] = useState<TeamStatus | null>(null);
  const byMember = skillsByMember(skills);
  const change = useMutation({
    mutationFn: (s: TeamStatus) => setTeamStatus(orgId, team.id, s),
    onMutate: (s) => setStatus(s),
    onSettled: async () => { setStatus(null); await qc.invalidateQueries({ queryKey: ["org", orgId, "teams"] }); },
  });
  const lead = team.members.find((m) => m.id === team.leadMemberId);
  const shown = (status ?? team.status) as TeamStatus;

  return (
    <article aria-labelledby={`team-${team.id}`} className="rounded-lg border border-ops-border bg-ops-surface p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`team-${team.id}`} className="truncate text-lg font-bold text-ops-ink">{team.name}</h2>
          <p className="text-sm text-ops-ink-muted">
            {lead ? <>{t("b2b.teams.leadLabel", "Lead")}: <span className="font-bold text-ops-ink">{nameOf(lead.displayName)}</span></> : t("b2b.teams.noLead", "No lead")}
            {" · "}{team.members.length} {t("b2b.teams.membersLower", "members")}
          </p>
          <p className="text-sm text-ops-ink-muted">
            {t("b2b.teams.hours", "Working hours")}: <span className="font-bold text-ops-ink">{summarizeHours(team.workingHours, t) ?? t("b2b.teams.hoursDefault", "Default")}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!team.active && <span className="inline-flex h-7 items-center rounded border border-sig-slate-ink px-2 text-xs font-bold text-sig-slate-ink">{t("b2b.teams.inactive", "Inactive")}</span>}
          <TeamStatusChip status={shown} />
          {actions.editTeam && (
            <button type="button" onClick={() => onEdit(team)} className={btnSecondary}>
              <Pencil className="h-4 w-4" aria-hidden="true" />{t("b2b.common.edit", "Edit")}<span className="sr-only"> {team.name}</span>
            </button>
          )}
        </div>
      </header>

      {actions.changeTeamStatus && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor={`st-${team.id}`} className="text-sm font-bold text-ops-ink">{t("b2b.teams.setStatus", "Set status")}</label>
          <select id={`st-${team.id}`} value={shown} disabled={change.isPending} onChange={(e) => change.mutate(e.target.value as TeamStatus)} className={`${inputCls} w-auto`}>
            {STATUSES.map((s) => <option key={s} value={s}>{teamStatusLabel(t, s)}</option>)}
          </select>
        </div>
      )}
      {change.isError && <div className="mt-3"><ErrorAlert message={catalogErrorMessage(change.error, "team", t)} /></div>}

      {team.members.length === 0 ? (
        <p className="mt-3 text-sm text-ops-ink-muted">{actions.editTeam ? t("b2b.teams.noMembersManager", "No members yet. Use Edit to add technicians.") : t("b2b.teams.noMembersViewer", "No members yet. Ask a manager to add technicians.")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-ops-border border-t border-ops-border">
          {team.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="flex min-w-[10rem] items-center gap-1 font-bold text-ops-ink">
                {m.id === team.leadMemberId && <Star className="h-4 w-4 text-sig-orange-ink" aria-label={t("b2b.teams.leadLabel", "Lead")} />}
                {nameOf(m.displayName)}
              </span>
              <span className="flex flex-wrap gap-1">
                {(byMember.get(m.id) ?? []).map((s) => <span key={s.id} className="rounded bg-ops-canvas px-1.5 py-0.5 text-xs text-ops-ink">{s.name}</span>)}
                {!byMember.has(m.id) && <span className="text-xs text-ops-ink-muted">{t("b2b.teams.noSkills", "No skills")}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
