"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, TriangleAlert } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { ErrorAlert, btnPrimary, btnSecondary, inputCls } from "@/b2b/components/catalog/ui";
import { downloadErrorReport, type ImportPreview } from "../api";
import { setupErrorMessage } from "../errors";
import { useTr } from "../i18n";
import { actionable, confirmWord, isConfirmTyped, needsTypedConfirm, progressPercent, type Kind } from "./importLogic";
import { useImportPoll } from "./useImportPoll";

interface ConfirmProps { kind: Kind; preview: ImportPreview; skip: boolean; online: boolean; busy: boolean; error: string | null; onBack: () => void; onCommit: () => void }

export function ConfirmStep({ kind, preview, skip, online, busy, error, onBack, onCommit }: ConfirmProps) {
  const { tr, trn } = useTr();
  const n = actionable(preview.counts);
  const word = confirmWord(kind, tr);
  const [typed, setTyped] = useState("");
  const needsWord = needsTypedConfirm(n);
  const ok = !needsWord || isConfirmTyped(typed, word);
  const created = kind === "employees"
    ? trn("b2b.import.confirm.created", { one: "{n} person will be created", other: "{n} people will be created", few: "{n} persoane vor fi create" }, preview.counts.create)
    : trn("b2b.import.confirm.createdClients", { one: "{n} client will be created", other: "{n} clients will be created", few: "{n} clienți vor fi creați" }, preview.counts.create);
  const summary = `${created} ${tr("b2b.import.confirm.andUpdated", "and {u} updated. Nothing is deleted.", { u: preview.counts.update })}`;
  return (
    <section aria-labelledby="confirm-h" className="space-y-4 rounded-lg border border-ops-border bg-ops-surface p-4">
      <h2 id="confirm-h" className="text-lg font-bold">{tr("b2b.import.step.confirm", "Confirm")}</h2>
      <p className="text-sm">{summary}</p>
      {skip && <p className="text-sm font-bold">{trn("b2b.import.confirm.skipping", { one: "{n} row with errors will be skipped.", other: "{n} rows with errors will be skipped.", few: "{n} rânduri cu erori vor fi omise." }, preview.counts.error)}</p>}
      {needsWord && (
        <div>
          <label htmlFor="confirm-word" className="block text-sm font-bold">{tr("b2b.import.confirm.type", "Type {word} to confirm", { word })}</label>
          <input id="confirm-word" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} className={`${inputCls} max-w-xs`} />
        </div>
      )}
      {error && <ErrorAlert message={error} />}
      {!online && <p role="status" className="text-sm font-bold">{tr("b2b.import.offline", "You're offline. Reconnect to import.")}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" onClick={onBack} disabled={busy} className={btnSecondary}>{tr("b2b.common.back", "Back")}</button>
        <button type="button" onClick={onCommit} disabled={busy || !online || !ok} className={btnPrimary}>{busy ? tr("b2b.import.importing", "Importing…") : tr("b2b.import.confirm.cta", "Import now")}</button>
      </div>
    </section>
  );
}

export function ResultStep({ kind, result, doneHref, onRestart }: { kind: Kind; result: ImportPreview; doneHref: string; onRestart: () => void }) {
  const { tr, trn } = useTr();
  const { orgId } = useOrg();
  const live = useImportPoll(orgId, result) ?? result;
  const [reportError, setReportError] = useState<string | null>(null);
  const c = live.counts;
  if (live.status === "COMMITTING") {
    const pct = progressPercent(live.processedRows, live.totalRows);
    return (
      <section aria-labelledby="res-h" className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 id="res-h" className="text-lg font-bold">{tr("b2b.import.step.result", "Result")}</h2>
        <div role="status">
          <p className="text-sm">{trn("b2b.import.progress", { one: "Importing {done} of {n} row. You can leave this page. We'll finish in the background.", other: "Importing {done} of {n} rows. You can leave this page. We'll finish in the background." }, live.totalRows, { done: live.processedRows })}</p>
          <progress className="mt-2 h-3 w-full" max={100} value={pct} aria-label={tr("b2b.import.progressLabel", "Import progress")} />
        </div>
      </section>
    );
  }
  const failed = live.status === "FAILED";
  return (
    <section aria-labelledby="res-h" className="space-y-4 rounded-lg border border-ops-border bg-ops-surface p-4">
      <h2 id="res-h" className="flex items-center gap-2 text-lg font-bold">
        {failed ? <TriangleAlert className="h-5 w-5 text-sig-vermilion-ink" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5 text-sig-green-ink" aria-hidden="true" />}
        {failed ? tr("b2b.import.failed", "The import stopped") : tr("b2b.import.done", "Import finished")}
      </h2>
      <div role="status" className="space-y-2 text-sm">
        {failed && <p className="font-bold">{live.failureMessage ?? tr("b2b.setup.err.generic", "Something went wrong. Try again in a moment.")}</p>}
        {failed && <p>{tr("b2b.import.failedHint", "Upload the same file again to finish the rest")}</p>}
        <p>{tr("b2b.import.resultCounts", "{c} created, {u} updated, {s} skipped, {e} with errors.", { c: c.create, u: c.update, s: c.skip, e: c.error })}</p>
      </div>
      {reportError && <ErrorAlert message={reportError} />}
      <div className="flex flex-wrap gap-2">
        {(c.error > 0 || c.warning > 0) && <button type="button" className={btnSecondary} onClick={() => { setReportError(null); downloadErrorReport(orgId, live.id).catch((e) => setReportError(setupErrorMessage(e, tr))); }}><Download className="h-4 w-4" aria-hidden="true" />{tr("b2b.import.errorReport", "Error report (CSV)")}</button>}
        {failed && <button type="button" className={btnSecondary} onClick={onRestart}>{tr("b2b.import.startAgain", "Upload a file again")}</button>}
        <Link href={doneHref} className={btnPrimary}>{kind === "employees" ? tr("b2b.import.viewTeam", "View team") : tr("b2b.import.viewClients", "View clients")}</Link>
      </div>
    </section>
  );
}
