"use client";

import { personSortKey } from "@/b2b/lib/person";
import { usePersonName } from "@/b2b/lib/usePersonName";
import { useState } from "react";
import { isB2bError } from "@/b2b/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import type { Team } from "@/b2b/api/types";
import type { OrgMemberRow } from "@/b2b/api/catalog-types";
import { createTeam, setTeamMembers, updateTeam } from "@/b2b/api/catalog";
import { catalogErrorMessage, diffIds, leadAfterMemberChange, toggleId, validateName } from "@/b2b/lib/catalog";
import { draftChanged, fromDraft, toDraft, validateDraft } from "@/b2b/lib/working-hours";
import { WorkingHoursEditor } from "./WorkingHoursEditor";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";

interface Props { orgId: string; team?: Team; members: OrgMemberRow[] | undefined; onClose: () => void }

/** Create or edit a team: name, members (checklist), lead, active. Mounted only while open (fresh state per open). */
export function TeamDialog({ orgId, team, members, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Modal open title={team ? t("b2b.teams.edit", "Edit {name}").replace("{name}", team.name) : t("b2b.teams.new", "New team")} onClose={onClose}>
      <TeamForm orgId={orgId} team={team} members={members} onClose={onClose} />
    </Modal>
  );
}

function TeamForm({ orgId, team, members, onClose }: Props) {
  const { t } = useTranslation();
  const nameOf = usePersonName();
  const qc = useQueryClient();
  const initialIds = team?.members.map((m) => m.id) ?? [];
  const [name, setName] = useState(team?.name ?? "");
  const [ids, setIds] = useState<string[]>(initialIds);
  const [lead, setLead] = useState<string>(team?.leadMemberId ?? "");
  const [active, setActive] = useState(team?.active ?? true);
  const [touched, setTouched] = useState(false);
  const initialHours = toDraft(team?.workingHours);
  const [useDefaultHours, setUseDefaultHours] = useState(!team?.workingHours);
  const [hours, setHours] = useState(initialHours);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const hoursChanged = useDefaultHours ? !!team?.workingHours : !team?.workingHours || draftChanged(hours, initialHours);

  const nameError = touched ? validateName(name, 120, t("b2b.catalog.label.team", "Team name"), t) : undefined;
  // Members we know the name of; keep existing members visible even if the members list is unavailable.
  const known = new Map<string, string | null>();
  for (const m of team?.members ?? []) known.set(m.id, m.displayName);
  for (const m of members ?? []) known.set(m.id, m.displayName);
  const options = [...known.entries()]
    .map(([id, name]) => ({ id, displayName: nameOf(name), sort: personSortKey(name) }))
    .sort((a, b) => a.sort.localeCompare(b.sort) || a.displayName.localeCompare(b.displayName));
  const effectiveLead = leadAfterMemberChange(lead, ids) ?? "";

  const save = useMutation({
    mutationFn: async () => {
      if (!team) {
        await createTeam(orgId, { name: name.trim(), memberIds: ids, leadMemberId: effectiveLead || null });
        return;
      }
      // Members first: the API requires the lead to be a member.
      if (diffIds(initialIds, ids).changed) await setTeamMembers(orgId, team.id, ids);
      await updateTeam(orgId, team.id, { name: name.trim(), leadMemberId: effectiveLead || null, active });
      if (hoursChanged) {
        // Separate request: before migration 0006 only this one fails (503), the rest is saved.
        try {
          await updateTeam(orgId, team.id, { workingHours: useDefaultHours ? null : fromDraft(hours) });
        } catch (e) {
          setHoursError(isB2bError(e) && e.isMigrationPending ? t("b2b.teams.hoursPending", "Hours can't be saved yet. The other changes were saved.") : catalogErrorMessage(e, "team"));
          return "hours-failed" as const;
        }
      }
    },
    onSuccess: async (outcome) => {
      await qc.invalidateQueries({ queryKey: ["org", orgId, "teams"] });
      if (outcome !== "hours-failed") onClose();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (validateName(name, 120, t("b2b.catalog.label.team", "Team name"), t)) return;
    if (team && !useDefaultHours && Object.keys(validateDraft(hours, t)).length > 0) return;
    setHoursError(null);
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={t("b2b.teams.name", "Team name")} error={nameError}>
        {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} />}
      </Field>

      <fieldset className="space-y-1">
        <legend className="text-sm font-bold text-ops-ink">{t("b2b.teams.members", "Members")}</legend>
        {members === undefined && !team ? (
          <p className="text-sm text-ops-ink-muted">{t("b2b.teams.noMemberList", "The member list isn't available to you, so members can't be chosen here.")}</p>
        ) : (
          <ul className="max-h-56 divide-y divide-ops-border overflow-y-auto rounded border border-ops-border-strong">
            {options.map((o) => (
              <li key={o.id}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 text-sm">
                  <input type="checkbox" className="h-5 w-5" checked={ids.includes(o.id)} onChange={() => setIds(toggleId(ids, o.id))} />
                  {o.displayName}
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-ops-ink-muted" aria-live="polite">{ids.length} {t("b2b.teams.selected", "selected")}</p>
      </fieldset>

      <Field label={t("b2b.teams.lead", "Team lead")} hint={t("b2b.teams.leadHint", "The lead must be a member of the team.")}>
        {(p) => (
          <select id={p.id} aria-describedby={p.describedBy} value={effectiveLead} onChange={(e) => setLead(e.target.value)} className={inputCls}>
            <option value="">{t("b2b.teams.noLead", "No lead")}</option>
            {options.filter((o) => ids.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.displayName}</option>)}
          </select>
        )}
      </Field>

      {team && (
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-bold text-ops-ink">
          <input type="checkbox" className="h-5 w-5" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {t("b2b.teams.active", "Team is active")}
        </label>
      )}

      {team && (
        <WorkingHoursEditor useDefault={useDefaultHours} draft={hours} showErrors={touched} onUseDefault={setUseDefaultHours} onChange={setHours} />
      )}
      {hoursError && <ErrorAlert message={hoursError} />}

      {save.isError && <ErrorAlert message={catalogErrorMessage(save.error, "team", t)} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending} className={btnPrimary}>{save.isPending ? t("b2b.common.saving", "Saving…") : t("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
