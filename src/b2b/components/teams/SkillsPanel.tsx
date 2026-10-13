"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Skill } from "@/b2b/api/catalog-types";
import { createSkill, deleteSkill, renameSkill } from "@/b2b/api/catalog";
import { catalogErrorMessage, validateName } from "@/b2b/lib/catalog";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnDanger, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";

type Dialog = { kind: "create" } | { kind: "rename"; skill: Skill } | { kind: "delete"; skill: Skill } | null;

export function SkillsPanel({ orgId, skills, canManage }: { orgId: string; skills: Skill[]; canManage: boolean }) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  return (
    <section aria-labelledby="skills-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="skills-h" className="text-lg font-bold text-ops-ink">{t("b2b.skills.title", "Skills")}</h2>
        {canManage && <button type="button" onClick={() => setDialog({ kind: "create" })} className={btnSecondary}><Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.skills.new", "New skill")}</button>}
      </div>
      {skills.length === 0 ? (
        <p className="rounded border border-dashed border-ops-border-strong p-4 text-sm text-ops-ink-muted">
          {canManage ? t("b2b.skills.emptyManager", "No skills yet. Create skills such as HVAC or Electrical, then assign them to technicians.") : t("b2b.skills.emptyViewer", "No skills have been defined. Ask a team manager to add them.")}
        </p>
      ) : (
        <ul className="divide-y divide-ops-border rounded-lg border border-ops-border bg-ops-surface">
          {skills.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1">
              <span className="text-sm font-bold text-ops-ink">{s.name} <span className="font-normal text-ops-ink-muted">· {s.memberIds.length}</span></span>
              {canManage && (
                <span className="flex gap-1">
                  <button type="button" onClick={() => setDialog({ kind: "rename", skill: s })} className={btnSecondary}><Pencil className="h-4 w-4" aria-hidden="true" />{t("b2b.skills.rename", "Rename")}<span className="sr-only"> {s.name}</span></button>
                  <button type="button" onClick={() => setDialog({ kind: "delete", skill: s })} className={btnSecondary}><Trash2 className="h-4 w-4" aria-hidden="true" />{t("b2b.common.delete", "Delete")}<span className="sr-only"> {s.name}</span></button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {dialog && (
        <Modal open title={dialog.kind === "create" ? "New skill" : dialog.kind === "rename" ? `Rename ${dialog.skill.name}` : `Delete ${dialog.skill.name}?`} onClose={close}>
          {dialog.kind === "delete" ? <DeleteSkill orgId={orgId} skill={dialog.skill} onDone={close} /> : <SkillForm orgId={orgId} skill={dialog.kind === "rename" ? dialog.skill : undefined} onDone={close} />}
        </Modal>
      )}
    </section>
  );
}

function SkillForm({ orgId, skill, onDone }: { orgId: string; skill?: Skill; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState(skill?.name ?? "");
  const [touched, setTouched] = useState(false);
  const error = touched ? validateName(name, 80, "Skill name") : undefined;
  const save = useMutation({
    mutationFn: () => (skill ? renameSkill(orgId, skill.id, name.trim()) : createSkill(orgId, name.trim())),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["org", orgId, "skills"] }); onDone(); },
  });
  return (
    <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!validateName(name, 80, "Skill name")) save.mutate(); }}>
      <Field label={t("b2b.skills.name", "Skill name")} error={error}>
        {(p) => <input id={p.id} aria-describedby={p.describedBy} aria-invalid={p.invalid} autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={inputCls} />}
      </Field>
      {save.isError && <ErrorAlert message={catalogErrorMessage(save.error, "skill")} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
        <button type="submit" disabled={save.isPending} className={btnPrimary}>{t("b2b.common.save", "Save")}</button>
      </div>
    </form>
  );
}

function DeleteSkill({ orgId, skill, onDone }: { orgId: string; skill: Skill; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => deleteSkill(orgId, skill.id),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["org", orgId, "skills"] }); onDone(); },
  });
  return (
    <div className="space-y-4">
      <p className="text-sm text-ops-ink">{t("b2b.skills.deleteBody", "This removes the skill from all technicians. You can't delete a skill that a job requires.")}</p>
      {del.isError && <ErrorAlert message={catalogErrorMessage(del.error, "skill")} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={btnSecondary}>{t("b2b.common.cancel", "Cancel")}</button>
        <button type="button" disabled={del.isPending} onClick={() => del.mutate()} className={btnDanger}>{t("b2b.common.delete", "Delete")}</button>
      </div>
    </div>
  );
}
