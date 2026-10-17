"use client";

import { useState, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/b2b/components/catalog/Modal";
import { ErrorAlert, btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { createInvitation, sk, type Member } from "../api";
import { setupErrorMessage } from "../errors";
import { useTr } from "../i18n";
import { splitInvitable } from "./memberLogic";

/** "Invite selected (n)": people with an email are invited one by one; the rest are listed and skipped. */
export function BulkInviteDialog({ orgId, members, online, onClose, onDone }: { orgId: string; members: Member[] | null; online: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <Modal open={!!members} title="" onClose={onClose}>
      {members && <Body key="bulk" orgId={orgId} members={members} online={online} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function Body({ orgId, members, online, onClose, onDone }: { orgId: string; members: Member[]; online: boolean; onClose: () => void; onDone: () => void }) {
  const headingId = useId();
  const { tr, trn } = useTr();
  const qc = useQueryClient();
  const { invitable, skipped } = splitInvitable(members);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ sent: number; failed: string[]; noEmail: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    const failed: string[] = [];
    let sent = 0;
    for (const m of invitable) {
      try {
        const r = await createInvitation(orgId, { email: m.workEmail as string, memberId: m.id });
        if (r.emailSent) sent += 1; else failed.push(m.displayName);
      } catch (err) {
        failed.push(m.displayName);
        setError(setupErrorMessage(err, tr));
      }
    }
    void qc.invalidateQueries({ queryKey: sk.membersAll(orgId) });
    void qc.invalidateQueries({ queryKey: sk.invitations(orgId) });
    void qc.invalidateQueries({ queryKey: sk.setup(orgId) });
    setReport({ sent, failed, noEmail: skipped.length });
    setBusy(false);
    onDone();
  };

  return (
    <div className="space-y-4">
      <h2 id={headingId} data-modal-title className="text-lg font-bold">{tr("b2b.team.bulk.title", "Invite selected ({n})", { n: members.length })}</h2>
      {report ? (
        <div role="status" className="space-y-2 text-sm">
          <p>{tr("b2b.team.bulk.result", "{n} invitations sent.", { n: report.sent })}</p>
          {report.failed.length > 0 && <p>{tr("b2b.team.bulk.failed", "Not sent: {names}. Open each person to copy the link or try again.", { names: report.failed.join(", ") })}</p>}
          {error && <ErrorAlert message={error} />}
          <div className="flex justify-end"><button type="button" onClick={onClose} className={btnPrimary}>{tr("b2b.common.done", "Done")}</button></div>
        </div>
      ) : (
        <>
          <p className="text-sm text-ops-ink-muted">{trn("b2b.team.bulk.lead", { one: "{n} person will get an email with a link.", other: "{n} people will get an email with a link.", few: "{n} persoane" }, invitable.length)}</p>
          {skipped.length > 0 && (
            <div className="rounded border border-ops-border-strong p-3 text-sm">
              <p className="font-bold">{tr("b2b.team.bulk.skipped", "Skipped: no email address ({n})", { n: skipped.length })}</p>
              <ul className="mt-1 list-disc pl-5">{skipped.map((m) => <li key={m.id}>{m.displayName}</li>)}</ul>
            </div>
          )}
          {!online && <p role="status" className="text-sm font-bold">{tr("b2b.setup.offline", "You're offline. Reconnect to save.")}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>{tr("b2b.common.cancel", "Cancel")}</button>
            <button type="button" onClick={run} disabled={busy || !online || invitable.length === 0} className={btnPrimary}>{trn("b2b.team.bulk.send", { one: "Send {n} invitation", other: "Send {n} invitations", few: "Trimite {n} invitații" }, invitable.length)}</button>
          </div>
        </>
      )}
    </div>
  );
}
