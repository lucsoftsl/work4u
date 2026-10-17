"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "../Drawer";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { createMember, revokeInvitation, sk, updateMember, type Invitation, type Member, type Role } from "../api";
import { duplicateField, setupErrorMessage } from "../errors";
import { useTr } from "../i18n";
import { buildCreateBody, buildMemberPatch, formFromMember, selectableRoles, type MemberForm } from "./memberLogic";

export type DrawerTarget = { mode: "add" } | { mode: "edit"; member: Member };

interface Props {
  orgId: string;
  target: DrawerTarget | null;
  roles: Role[] | undefined;
  viewerTemplate: string | undefined;
  invitation?: Invitation;
  online: boolean;
  canManage: boolean;
  onClose: () => void;
  onInvite: (m: Member) => void;
  onStatus: (m: Member, a: "suspend" | "reactivate" | "remove") => void;
}

export function MemberDrawer(props: Props) {
  const { tr } = useTr();
  const { target, onClose } = props;
  const title = target?.mode === "edit" ? tr("b2b.team.drawer.editTitle", "Edit {name}", { name: target.member.displayName }) : tr("b2b.team.add", "Add employee");
  return (
    <Drawer open={!!target} title={title} onClose={onClose} closeLabel={tr("b2b.common.close", "Close")}>
      {target && <DrawerForm key={target.mode === "edit" ? target.member.id : "add"} {...props} target={target} />}
    </Drawer>
  );
}

function DrawerForm({ orgId, target, roles, viewerTemplate, invitation, online, canManage, onClose, onInvite, onStatus }: Props & { target: DrawerTarget }) {
  const { tr } = useTr();
  const qc = useQueryClient();
  const member = target.mode === "edit" ? target.member : undefined;
  const [form, setForm] = useState<MemberForm>(() => formFromMember(member));
  const [nameTouched, setNameTouched] = useState(false);
  const [created, setCreated] = useState<Member | null>(null);
  const set = <K extends keyof MemberForm>(k: K, v: MemberForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const roleOptions = selectableRoles(roles, viewerTemplate, member?.role as Role | undefined);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: sk.membersAll(orgId) });
    void qc.invalidateQueries({ queryKey: sk.invitations(orgId) });
    void qc.invalidateQueries({ queryKey: sk.setup(orgId) });
  };
  const save = useMutation({
    mutationFn: async () => {
      if (member) return updateMember(orgId, member.id, buildMemberPatch(form, member) as never);
      return createMember(orgId, buildCreateBody(form) as never);
    },
    onSuccess: (m) => { refresh(); if (member) onClose(); else setCreated(m); },
  });
  const revoke = useMutation({ mutationFn: () => revokeInvitation(orgId, invitation?.id ?? ""), onSuccess: () => { refresh(); onClose(); } });

  const dupe = save.isError ? duplicateField(save.error) : null;
  const dupeMsg = save.isError && dupe ? setupErrorMessage(save.error, tr) : undefined;
  const summary = save.isError && !dupe ? setupErrorMessage(save.error, tr) : undefined;
  const nameError = nameTouched && form.displayName.trim() === "" ? tr("b2b.team.err.nameRequired", "Enter a name.") : undefined;
  const readOnly = !canManage;

  if (created) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded border border-ops-border-strong bg-ops-canvas p-3 text-sm">{tr("b2b.team.planningSaved", "Saved as Planning only: you can schedule this person, but they will not see jobs in the app. You can invite them later with an email address.")}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {created.workEmail && <button type="button" className={btnSecondary} onClick={() => { onClose(); onInvite(created); }}>{tr("b2b.team.inviteNow", "Invite now")}</button>}
          <button type="button" className={btnPrimary} onClick={onClose}>{tr("b2b.common.done", "Done")}</button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); setNameTouched(true); if (form.displayName.trim() && online && canManage) save.mutate(); }} className="space-y-4">
      <fieldset disabled={readOnly || save.isPending} className="space-y-4">
        <Field label={tr("b2b.team.field.name", "Full name")} error={nameError}>
          {(p) => <input id={p.id} required autoComplete="off" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} onBlur={() => setNameTouched(true)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
        </Field>
        <Field label={tr("b2b.team.field.phone", "Phone")} hint={dupe === "phone" ? undefined : tr("b2b.team.phoneHint", "International format, e.g. +34 600 555 021.")} error={dupe === "phone" ? dupeMsg : undefined}>
          {(p) => <input id={p.id} type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
        </Field>
        <Field label={tr("b2b.team.field.emailOptional", "Email (optional)")} error={dupe === "workEmail" ? dupeMsg : undefined}>
          {(p) => <input id={p.id} type="email" inputMode="email" autoComplete="off" value={form.workEmail} onChange={(e) => set("workEmail", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
        </Field>
        <Field label={tr("b2b.team.col.role", "Role")}>
          {(p) => (
            <select id={p.id} value={form.roleId} onChange={(e) => set("roleId", e.target.value)} className={inputCls}>
              {!member && <option value="">{tr("b2b.team.role.default", "Default role")}</option>}
              {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </Field>
        <Field label={tr("b2b.team.field.type", "Type")}>
          {(p) => (
            <select id={p.id} value={form.memberType} onChange={(e) => set("memberType", e.target.value as MemberForm["memberType"])} className={inputCls}>
              <option value="EMPLOYEE">{tr("b2b.team.type.employee", "Employee")}</option>
              <option value="CONTRACTOR">{tr("b2b.team.type.contractor", "Contractor")}</option>
            </select>
          )}
        </Field>
        <Field label={tr("b2b.team.field.externalId", "Employee ID (optional)")} error={dupe === "externalId" ? dupeMsg : undefined}>
          {(p) => <input id={p.id} autoComplete="off" value={form.externalId} onChange={(e) => set("externalId", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
        </Field>
      </fieldset>
      {!member && <p className="rounded border border-ops-border-strong bg-ops-canvas p-3 text-sm">{tr("b2b.team.planningSaved", "Saved as Planning only: you can schedule this person, but they will not see jobs in the app. You can invite them later with an email address.")}</p>}
      {summary && <ErrorAlert message={summary} />}
      {!online && <p role="status" className="text-sm font-bold">{tr("b2b.setup.offline", "You're offline. Reconnect to save.")}</p>}
      {member && <AccessAndStatus member={member} invitation={invitation} canManage={canManage && online} onInvite={onInvite} onStatus={onStatus} onRevoke={() => revoke.mutate()} revoking={revoke.isPending} revokeError={revoke.isError ? setupErrorMessage(revoke.error, tr) : undefined} />}
      {canManage && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-ops-border bg-ops-surface p-4">
          <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
          <button type="submit" disabled={save.isPending || !online} className={btnPrimary}>{member ? tr("b2b.team.saveChanges", "Save changes") : tr("b2b.team.addSave", "Add employee")}</button>
        </div>
      )}
    </form>
  );
}

function AccessAndStatus({ member, invitation, canManage, onInvite, onStatus, onRevoke, revoking, revokeError }: {
  member: Member; invitation?: Invitation; canManage: boolean; onInvite: (m: Member) => void; onStatus: Props["onStatus"]; onRevoke: () => void; revoking: boolean; revokeError?: string;
}) {
  const { tr, locale } = useTr();
  const fmtDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  const suspended = member.status === "SUSPENDED";
  return (
    <>
      <section aria-labelledby="drawer-access" className="space-y-2 border-t border-ops-border pt-4">
        <h3 id="drawer-access" className="text-sm font-bold">{tr("b2b.team.access.title", "App access")}</h3>
        {member.loginStatus === "ACTIVE" && <p className="text-sm">{tr("b2b.team.access.active", "This person uses the app.")}</p>}
        {member.loginStatus === "NONE" && <p className="text-sm text-ops-ink-muted">{tr("b2b.team.status.planningNote", "No app login. Scheduled by the office.")}</p>}
        {member.loginStatus === "INVITED" && (
          <p className="text-sm">
            {invitation ? tr("b2b.team.access.invitedOn", "Invitation sent {date}, expires {expires}.", { date: fmtDate(invitation.createdAt), expires: fmtDate(invitation.expiresAt) }) : tr("b2b.team.status.invited", "Invited")}
          </p>
        )}
        {revokeError && <ErrorAlert message={revokeError} />}
        {canManage && !suspended && member.loginStatus !== "ACTIVE" && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => onInvite(member)}>{member.loginStatus === "INVITED" ? tr("b2b.team.invite.resend", "Resend invitation") : tr("b2b.team.invite.menu", "Invite to the app")}</button>
            {member.loginStatus === "INVITED" && invitation && <button type="button" className={btnSecondary} disabled={revoking} onClick={onRevoke}>{tr("b2b.team.invite.revoke", "Revoke")}</button>}
          </div>
        )}
      </section>
      {canManage && (
        <section aria-labelledby="drawer-status" className="space-y-2 border-t border-ops-border pt-4">
          <h3 id="drawer-status" className="text-sm font-bold">{tr("b2b.team.col.status", "Status")}</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => onStatus(member, suspended ? "reactivate" : "suspend")}>{suspended ? tr("b2b.team.reactivate", "Reactivate") : tr("b2b.team.suspend", "Suspend")}</button>
            <button type="button" className={btnSecondary} onClick={() => onStatus(member, "remove")}>{tr("b2b.team.removeFromCompany", "Remove from company")}</button>
          </div>
        </section>
      )}
    </>
  );
}
