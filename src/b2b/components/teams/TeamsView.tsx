"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { listTeams, qk } from "@/b2b/api/endpoints";
import { ck, listMembers, listSkills } from "@/b2b/api/catalog";
import type { Team } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { catalogActions, catalogErrorMessage, isForbidden } from "@/b2b/lib/catalog";
import { EmptyState } from "@/b2b/components/EmptyState";
import { ErrorAlert, ListSkeleton, btnPrimary } from "@/b2b/components/catalog/ui";
import { TeamCard } from "./TeamCard";
import { TeamDialog } from "./TeamDialog";
import { SkillsPanel } from "./SkillsPanel";
import { MembersPanel } from "./MembersPanel";

type Editing = { team?: Team } | null;

export function TeamsView() {
  const { t } = useTranslation();
  const org = useOrg();
  const actions = catalogActions(org.can);
  const [editing, setEditing] = useState<Editing>(null);

  const teams = useQuery({ queryKey: qk.teams(org.orgId), queryFn: () => listTeams(org.orgId) });
  const skills = useQuery({ queryKey: ck.skills(org.orgId), queryFn: () => listSkills(org.orgId) });
  const members = useQuery({
    queryKey: ck.members(org.orgId), queryFn: () => listMembers(org.orgId), enabled: actions.viewMembers,
    retry: (n, err) => !isForbidden(err) && n < 2,
  });
  const showMembers = actions.viewMembers && !isForbidden(members.error);
  const skillList = skills.data ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ops-ink">{t("b2b.teams.title", "Teams")}</h1>
        {actions.createTeam && <button type="button" onClick={() => setEditing({})} className={btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.teams.new", "New team")}</button>}
      </div>

      <section aria-label={t("b2b.teams.title", "Teams")} className="space-y-3">
        {teams.isPending ? <ListSkeleton /> : teams.isError ? (
          <ErrorAlert message={isForbidden(teams.error) ? "You don't have access to teams." : "Teams could not be loaded."} onRetry={isForbidden(teams.error) ? undefined : () => void teams.refetch()} />
        ) : teams.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("b2b.teams.empty", "No teams yet")}
            body={actions.createTeam ? t("b2b.teams.emptyManager", "Create a team and add technicians so dispatchers can assign jobs to it.") : t("b2b.teams.emptyViewer", "No teams have been set up. Ask a team manager or administrator to create one.")}
            action={actions.createTeam ? <button type="button" onClick={() => setEditing({})} className={btnPrimary}>{t("b2b.teams.new", "New team")}</button> : undefined}
          />
        ) : (
          teams.data.map((team) => <TeamCard key={team.id} orgId={org.orgId} team={team} skills={skillList} actions={actions} onEdit={(tm) => setEditing({ team: tm })} />)
        )}
      </section>

      {skills.isError ? <ErrorAlert message={catalogErrorMessage(skills.error, "skill")} onRetry={() => void skills.refetch()} /> : !skills.isPending && (
        <SkillsPanel orgId={org.orgId} skills={skillList} canManage={actions.manageSkills} />
      )}

      {showMembers && (members.isPending ? <ListSkeleton rows={2} /> : members.isError ? (
        <ErrorAlert message="Members could not be loaded." onRetry={() => void members.refetch()} />
      ) : (
        <MembersPanel orgId={org.orgId} members={members.data} skills={skillList} canAssign={actions.assignSkills} />
      ))}

      {editing && <TeamDialog orgId={org.orgId} team={editing.team} members={showMembers ? members.data : undefined} onClose={() => setEditing(null)} />}
    </div>
  );
}
