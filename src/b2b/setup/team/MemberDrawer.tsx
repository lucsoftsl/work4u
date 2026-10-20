"use client";

import { usePersonName } from "@/b2b/lib/usePersonName";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer } from "../Drawer";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { createMember, revokeInvitation, sk, updateMember, type Invitation, type Member, type Role } from "../api";
import { duplicateField, setupErrorMessage, unknownFieldsText } from "../errors";
import { isB2bError } from "@/b2b/api/client";
import { splitApiFieldErrors } from "@/b2b/lib/apiFieldErrors";
import { useTr } from "../i18n";
import { useFocusFirstInvalid } from "../useFocusFirstInvalid";
import {
  MEMBER_FIELDS, MEMBER_FIELD_ALIASES, buildCreateBody, buildMemberPatch, formFromMember, memberFormProblems, selectableRoles, type MemberField, type MemberForm,
} from "./memberLogic";

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
  const nameOf = usePersonName();
  const { target, onClose } = props;
  const title = target?.mode === "edit" ? tr("b2b.team.drawer.editTitle", "Edit {name}", { name: nameOf(target.member.displayName) }) : tr("b2b.team.add", "Add employee");
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
  const [submitted, setSubmitted] = useState(false);
  const { ref: formRef, focusFirstInvalid } = useFocusFirstInvalid<HTMLFormElement>();
  const [created, setCreated] = useState<Member | null>(null);
  const set = <K extends keyof MemberForm>(k: K, v: MemberForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in serverErrors) save.reset(); // editing the field the API refused clears that refusal
  };
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
  // Once a failed save has rendered its field error (name, duplicate phone/email/ID), focus that field. A banner-only error leaves focus.
  useEffect(() => { if (save.error) focusFirstInvalid(); }, [save.error, focusFirstInvalid]);
  const FIELD_TEXT: Record<MemberField, string> = {
    displayName: form.displayName.trim() ? tr("b2b.team.err.nameNotEmail", "Enter the person's name, not an email address.") : tr("b2b.team.err.nameRequired", "Enter a name."),
    workEmail: tr("b2b.team.err.email", "Enter a valid email address, for example ana@company.com."),
    phone: tr("b2b.team.err.phone", "Enter the number in international format, e.g. +34 600 555 021."),
    externalId: tr("b2b.team.err.externalId", "Use up to 100 characters."),
    roleId: tr("b2b.team.err.role", "Pick a role from the list."),
    memberType: tr("b2b.team.err.type", "Pick Employee or Contractor."),
  };
  // Every field problem of a failed save lands on its field (c769b0c5): VALIDATION_ERROR `fields`, duplicates (`body.field`) and an unknown role.
  const api = save.isError ? splitApiFieldErrors(save.error, MEMBER_FIELDS, MEMBER_FIELD_ALIASES) : { fields: {}, unknown: [] };
  const dupe = save.isError ? duplicateField(save.error) : null;
  const serverErrors: Partial<Record<MemberField, string>> = {};
  for (const k of Object.keys(api.fields) as MemberField[]) serverErrors[k] = FIELD_TEXT[k];
  if (dupe) serverErrors[dupe] = setupErrorMessage(save.error, tr);
  if (save.isError && isB2bError(save.error) && save.error.code === "INVALID_REFERENCE" && !api.fields.roleId && Object.keys(api.fields).length === 0) serverErrors.roleId = tr("b2b.team.err.roleGone", "This role no longer exists. Pick another one.");
  const unknownText = unknownFieldsText(api.unknown, { teamIds: tr("b2b.team.field.teams", "Teams"), notifyChannel: tr("b2b.team.field.notify", "Notifications") }, tr);
  const summary = save.isError && Object.keys(serverErrors).length === 0 ? (unknownText ?? setupErrorMessage(save.error, tr)) : unknownText;
  const revoke = useMutation({ mutationFn: () => revokeInvitation(orgId, invitation?.id ?? ""), onSuccess: () => { refresh(); onClose(); } });

  const local = memberFormProblems(form);
  const shownLocal = { ...(submitted ? local : {}), ...(nameTouched && local.displayName ? { displayName: local.displayName } : {}) };
  const errorText = (k: MemberField): string | undefined => {
    if (k in serverErrors) return serverErrors[k];
    switch (k in shownLocal ? k : null) {
      case "displayName": return shownLocal.displayName === "required" ? tr("b2b.team.err.nameRequired", "Enter a name.") : tr("b2b.team.err.nameNotEmail", "Enter the person's name, not an email address.");
      case "workEmail": return FIELD_TEXT.workEmail;
      case "phone": return FIELD_TEXT.phone;
      case "externalId": return FIELD_TEXT.externalId;
      default: return undefined;
    }
  };
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
    <form ref={formRef} noValidate onSubmit={(e) => { e.preventDefault(); setNameTouched(true); setSubmitted(true); if (Object.keys(memberFormProblems(form)).length > 0) { focusFirstInvalid(); return; } if (online && canManage) save.mutate(); }} className="space-y-4">
      <fieldset disabled={readOnly || save.isPending} className="space-y-4">
        <Field label={tr("b2b.team.field.name", "Full name")} error={errorText("displayName")}>
          {(p) => <input id={p.id} required autoComplete="off" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} onBlur={() => setNameTouched(true)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
        </Field>
        <Field label={tr("b2b.team.field.phone", "Phone")} hint={tr("b2b.team.phoneHint", "International format, e.g. +34 600 555 021.")} error={errorText("phone")}>
          {(p) => <input id={p.id} type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
        </Field>
        <Field label={tr("b2b.team.field.emailOptional", "Email (optional)")} error={errorText("workEmail")}>
          {(p) => <input id={p.id} type="email" inputMode="email" autoComplete="off" value={form.workEmail} onChange={(e) => set("workEmail", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
        </Field>
        <Field label={tr("b2b.team.col.role", "Role")} error={serverErrors.roleId}>
          {(p) => (
            <select id={p.id} aria-invalid={p.invalid} aria-describedby={p.describedBy} value={form.roleId} onChange={(e) => set("roleId", e.target.value)} className={inputCls}>
              {!member && <option value="">{tr("b2b.team.role.default", "Default role")}</option>}
              {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </Field>
        <Field label={tr("b2b.team.field.type", "Type")} error={serverErrors.memberType}>
          {(p) => (
            <select id={p.id} aria-invalid={p.invalid} aria-describedby={p.describedBy} value={form.memberType} onChange={(e) => set("memberType", e.target.value as MemberForm["memberType"])} className={inputCls}>
              <option value="EMPLOYEE">{tr("b2b.team.type.employee", "Employee")}</option>
              <option value="CONTRACTOR">{tr("b2b.team.type.contractor", "Contractor")}</option>
            </select>
          )}
        </Field>
        <Field label={tr("b2b.team.field.externalId", "Employee ID (optional)")} error={errorText("externalId")}>
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
