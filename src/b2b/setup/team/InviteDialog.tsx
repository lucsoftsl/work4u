"use client";

import { useState, useId } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, Field, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { createInvitation, sk, type InvitationResult, type Member } from "../api";
import { setupErrorMessage } from "../errors";
import { useTr } from "../i18n";
import { buildInviteLink, isBlank, isEmail } from "./memberLogic";

/** Invite one person. Phone-only people must provide an email first. Falls back to a copy-link when the email did not go out. */
export function InviteDialog({ orgId, member, online, onClose, onDone }: { orgId: string; member: Member | null; online: boolean; onClose: () => void; onDone?: () => void }) {
  return (
    <Modal open={!!member} title="" onClose={onClose}>
      {member && <InviteBody key={member.id} orgId={orgId} member={member} online={online} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function InviteBody({ orgId, member, online, onClose, onDone }: { orgId: string; member: Member; online: boolean; onClose: () => void; onDone?: () => void }) {
  const headingId = useId();
  const { tr } = useTr();
  const qc = useQueryClient();
  const [email, setEmail] = useState(member.workEmail ?? "");
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const missing = isBlank(email);
  const invalid = !missing && !isEmail(email);
  const emailError = touched ? (missing ? tr("b2b.team.invite.needEmail", "An email address is needed to send an invitation.") : invalid ? tr("b2b.team.invite.badEmail", "Enter a valid email address.") : undefined) : undefined;
  const send = useMutation({
    mutationFn: () => createInvitation(orgId, { email: email.trim(), memberId: member.id }),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: sk.membersAll(orgId) });
      void qc.invalidateQueries({ queryKey: sk.invitations(orgId) });
      void qc.invalidateQueries({ queryKey: sk.setup(orgId) });
      onDone?.();
    },
  });
  const resend = member.loginStatus === "INVITED";
  const link = result ? buildInviteLink(window.location.origin, result.token) : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div className="space-y-4">
      <h2 id={headingId} data-modal-title className="text-lg font-bold">{tr("b2b.team.invite.title", "Invite {name} to the app", { name: member.displayName })}</h2>
      {result ? (
        <div className="space-y-3">
          {result.emailSent ? (
            <p role="status" className="text-sm text-ops-ink">{tr("b2b.team.invite.sent", "Invitation sent to {email}.", { email: result.email })}</p>
          ) : (
            <div role="status" className="space-y-2">
              <p className="text-sm font-bold text-ops-ink">{tr("b2b.team.invite.emailFailed", "We couldn't send the email. Copy the link instead.")}</p>
              <label className="sr-only" htmlFor="invite-link">{tr("b2b.team.invite.link", "Invitation link")}</label>
              <input id="invite-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={inputCls} />
              <button type="button" onClick={copy} className={btnSecondary}><Copy className="h-4 w-4" aria-hidden="true" />{copied ? tr("b2b.team.invite.copied", "Link copied") : tr("b2b.team.invite.copy", "Copy link")}</button>
            </div>
          )}
          <div className="flex justify-end"><button type="button" onClick={onClose} className={btnPrimary}>{tr("b2b.common.done", "Done")}</button></div>
        </div>
      ) : (
        <form noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!missing && !invalid && online) send.mutate(); }} className="space-y-4">
          <p className="text-sm text-ops-ink-muted">{tr("b2b.team.invite.lead", "We email a link. When {name} accepts, they keep their schedule and job history.", { name: member.displayName })}</p>
          <Field label={tr("b2b.team.field.email", "Email")} error={emailError}>
            {(p) => <input id={p.id} type="email" autoComplete="off" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={inputCls} />}
          </Field>
          {send.isError && <ErrorAlert message={setupErrorMessage(send.error, tr)} />}
          {!online && <p role="status" className="text-sm font-bold text-ops-ink">{tr("b2b.setup.offline", "You're offline. Reconnect to save.")}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
            <button type="submit" disabled={send.isPending || !online} className={btnPrimary}>{resend ? tr("b2b.team.invite.resend", "Resend invitation") : tr("b2b.team.invite.send", "Send invitation")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
