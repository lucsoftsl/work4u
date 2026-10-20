"use client";

import { usePersonName } from "@/b2b/lib/usePersonName";
import { useId } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, btnDanger, btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { sk, updateMember, type Member } from "../api";
import { setupErrorMessage } from "../errors";
import { useTr } from "../i18n";

export type StatusChange = { member: Member; action: "suspend" | "reactivate" | "remove" };

/** Confirms suspend / reactivate / remove. Remove is destructive and says what happens. */
export function ConfirmStatusDialog({ orgId, change, online, onClose }: { orgId: string; change: StatusChange | null; online: boolean; onClose: () => void }) {
  return (
    <Modal open={!!change} title="" onClose={onClose}>
      {change && <Body key={`${change.member.id}-${change.action}`} orgId={orgId} change={change} online={online} onClose={onClose} />}
    </Modal>
  );
}

function Body({ orgId, change, online, onClose }: { orgId: string; change: StatusChange; online: boolean; onClose: () => void }) {
  const headingId = useId();
  const { tr } = useTr();
  const nameOf = usePersonName();
  const qc = useQueryClient();
  const { member, action } = change;
  const mut = useMutation({
    mutationFn: () => updateMember(orgId, member.id, { status: action === "remove" ? "REMOVED" : action === "suspend" ? "SUSPENDED" : "ACTIVE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sk.membersAll(orgId) });
      void qc.invalidateQueries({ queryKey: sk.invitations(orgId) });
      void qc.invalidateQueries({ queryKey: sk.setup(orgId) });
      onClose();
    },
  });
  const copy = {
    remove: { title: tr("b2b.team.confirm.removeTitle", "Remove {name} from the company?", { name: nameOf(member.displayName) }), body: tr("b2b.team.confirm.removeBody", "They disappear from the team and can no longer be scheduled. Their job history is kept."), cta: tr("b2b.team.remove", "Remove") },
    suspend: { title: tr("b2b.team.confirm.suspendTitle", "Suspend {name}?", { name: nameOf(member.displayName) }), body: tr("b2b.team.confirm.suspendBody", "They can't use the app until you reactivate them. Pending invitations are cancelled."), cta: tr("b2b.team.suspend", "Suspend") },
    reactivate: { title: tr("b2b.team.confirm.reactivateTitle", "Reactivate {name}?", { name: nameOf(member.displayName) }), body: tr("b2b.team.confirm.reactivateBody", "They can be scheduled again."), cta: tr("b2b.team.reactivate", "Reactivate") },
  }[action];
  return (
    <div className="space-y-4">
      <h2 id={headingId} data-modal-title className="text-lg font-bold">{copy.title}</h2>
      <p className="text-sm text-ops-ink-muted">{copy.body}</p>
      {mut.isError && <ErrorAlert message={setupErrorMessage(mut.error, tr)} />}
      {!online && <p role="status" className="text-sm font-bold">{tr("b2b.setup.offline", "You're offline. Reconnect to save.")}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
        <button type="button" disabled={mut.isPending || !online} onClick={() => mut.mutate()} className={action === "remove" ? btnDanger : btnPrimary}>{copy.cta}</button>
      </div>
    </div>
  );
}
