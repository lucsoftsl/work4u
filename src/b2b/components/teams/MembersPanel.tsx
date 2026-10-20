"use client";

import { usePersonName } from "@/b2b/lib/usePersonName";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Tags } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { OrgMemberRow, Skill } from "@/b2b/api/catalog-types";
import { setMemberSkills } from "@/b2b/api/catalog";
import { catalogErrorMessage, filterMembers, memberSkillIds, skillsByMember, toggleId } from "@/b2b/lib/catalog";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";

export function MembersPanel({ orgId, members, skills, canAssign }: { orgId: string; members: OrgMemberRow[]; skills: Skill[]; canAssign: boolean }) {
  const { t } = useTranslation();
  const nameOf = usePersonName();
  const [q, setQ] = useState("");
  const [skillId, setSkillId] = useState("");
  const [editing, setEditing] = useState<OrgMemberRow | null>(null);
  const rows = filterMembers(members, q, skillId || undefined, skills);
  const byMember = skillsByMember(skills);
  return (
    <section aria-labelledby="members-h" className="space-y-3">
      <h2 id="members-h" className="text-lg font-bold text-ops-ink">{t("b2b.members.title", "Technicians and members")}</h2>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <label htmlFor="member-q" className="sr-only">{t("b2b.members.search", "Search members")}</label>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ops-ink-subtle" aria-hidden="true" />
          <input id="member-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("b2b.members.search", "Search members")} className={`${inputCls} pl-9`} />
        </div>
        <label htmlFor="member-skill" className="sr-only">{t("b2b.members.filterSkill", "Filter by skill")}</label>
        <select id="member-skill" value={skillId} onChange={(e) => setSkillId(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">{t("b2b.members.allSkills", "All skills")}</option>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="rounded border border-dashed border-ops-border-strong p-4 text-sm text-ops-ink-muted">{t("b2b.members.none", "No members match.")}</p>
      ) : (
        <ul className="divide-y divide-ops-border rounded-lg border border-ops-border bg-ops-surface">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
              <div className="min-w-[10rem] flex-1">
                <p className="text-sm font-bold text-ops-ink">{nameOf(m.displayName)}</p>
                <p className="text-xs text-ops-ink-muted">{[m.role?.name, m.status && m.status !== "ACTIVE" ? m.status.toLowerCase() : null].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="flex flex-1 flex-wrap gap-1">
                {(byMember.get(m.id) ?? []).map((s) => <span key={s.id} className="rounded bg-ops-canvas px-1.5 py-0.5 text-xs text-ops-ink">{s.name}</span>)}
              </span>
              {canAssign && (
                <button type="button" onClick={() => setEditing(m)} className={btnSecondary}>
                  <Tags className="h-4 w-4" aria-hidden="true" />{t("b2b.members.skills", "Skills")}<span className="sr-only"> {nameOf(m.displayName)}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Modal open title={t("b2b.members.skillsFor", "Skills for {name}").replace("{name}", nameOf(editing.displayName))} onClose={() => setEditing(null)}>
          <MemberSkillsForm orgId={orgId} member={editing} skills={skills} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </section>
  );
}

function MemberSkillsForm({ orgId, member, skills, onDone }: { orgId: string; member: OrgMemberRow; skills: Skill[]; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [ids, setIds] = useState(() => memberSkillIds(skills, member.id));
  const save = useMutation({
    mutationFn: () => setMemberSkills(orgId, member.id, ids),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["org", orgId, "skills"] }); onDone(); },
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      {skills.length === 0 ? (
        <p className="text-sm text-ops-ink-muted">{t("b2b.members.noSkillsDefined", "No skills exist yet. Create one in the Skills section first.")}</p>
      ) : (
        <fieldset>
          <legend className="sr-only">{t("b2b.members.skills", "Skills")}</legend>
          <ul className="divide-y divide-ops-border rounded border border-ops-border-strong">
            {skills.map((s) => (
              <li key={s.id}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 text-sm">
                  <input type="checkbox" className="h-5 w-5" checked={ids.includes(s.id)} onChange={() => setIds(toggleId(ids, s.id))} />{s.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      {save.isError && <ErrorAlert message={catalogErrorMessage(save.error, "skill", t)} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending || skills.length === 0} className={btnPrimary}>{t("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}
