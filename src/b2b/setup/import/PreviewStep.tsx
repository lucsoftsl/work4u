"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TriangleAlert } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { ErrorAlert, btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { cn } from "@/lib/utils";
import { downloadErrorReport, listImportRows, type ImportPreview, type ImportRow } from "../api";
import { setupErrorMessage } from "../errors";
import { useTr } from "../i18n";
import { actionable, commitMode, rowKeyValues, sortPreviewRows, unwrapRows, type Kind } from "./importLogic";

const ACTION_CLS: Record<ImportRow["action"], string> = {
  CREATE: "bg-sig-green-tint text-sig-green-ink", UPDATE: "bg-sig-blue-tint text-sig-blue-ink",
  SKIP: "border border-dashed border-sig-slate-ink text-sig-slate-ink", ERROR: "bg-sig-vermilion-tint text-sig-vermilion-ink",
};

function ActionBadge({ action }: { action: ImportRow["action"] }) {
  const { tr } = useTr();
  const label = { CREATE: tr("b2b.import.action.create", "Create"), UPDATE: tr("b2b.import.action.update", "Update"), SKIP: tr("b2b.import.action.skip", "Skip"), ERROR: tr("b2b.import.action.error", "Error") }[action];
  return <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold", ACTION_CLS[action])}>{action === "ERROR" && <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />}{label}</span>;
}

function Problems({ row }: { row: ImportRow }) {
  return (
    <div className="space-y-1 text-sm">
      {row.errors.map((e, i) => <p key={`e${i}`} className="font-bold text-sig-vermilion-ink">{e.field ? `${e.field}: ` : ""}{e.message}</p>)}
      {row.warnings.length > 0 && (
        <ul className="flex flex-wrap gap-1">{row.warnings.map((w, i) => <li key={`w${i}`} className="rounded bg-ops-canvas px-2 py-0.5 text-xs text-ops-ink">{w.message}</li>)}</ul>
      )}
    </div>
  );
}

interface Props { kind: Kind; preview: ImportPreview; online: boolean; busy: boolean; commitError: string | null; onBack: () => void; onCommit: (skip: boolean) => void }

export function PreviewStep({ kind, preview, online, busy, commitError, onBack, onCommit }: Props) {
  const { tr, trn } = useTr();
  const { orgId } = useOrg();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const c = preview.counts;
  const extra = useQuery({
    queryKey: ["org", orgId, "import", preview.id, "error-rows"],
    queryFn: () => listImportRows(orgId, preview.id, { action: "ERROR", limit: 200 }).then(unwrapRows),
    enabled: errorsOnly && preview.hasMoreRows && c.error > 0,
    retry: false,
  });
  const rows = sortPreviewRows(errorsOnly && extra.data ? extra.data : preview.rows, errorsOnly);
  const mode = commitMode(c);
  const n = actionable(c);
  const importLabel = kind === "employees"
    ? trn("b2b.import.commit", { one: "Import {n} person", other: "Import {n} people", few: "Importă {n} persoane" }, n)
    : trn("b2b.import.commitClients", { one: "Import {n} client", other: "Import {n} clients", few: "Importă {n} clienți" }, n);
  const commitLabel = mode === "skip"
    ? `${importLabel}, ${trn("b2b.import.skipSuffix", { one: "skip {n} row with errors", other: "skip {n} rows with errors", few: "omite {n} rânduri cu erori" }, c.error)}`
    : importLabel;
  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-ops-ink-muted";
  return (
    <div className="space-y-4">
      <section aria-labelledby="prev-h" className="space-y-3">
        <h2 id="prev-h" className="text-lg font-bold">{tr("b2b.import.previewTitle", "Preview: nothing is saved yet")}</h2>
        <dl className="grid grid-cols-2 gap-2 min-[700px]:grid-cols-5">
          {([["create", tr("b2b.import.count.create", "To create")], ["update", tr("b2b.import.count.update", "To update")], ["skip", tr("b2b.import.count.skip", "Skipped")], ["error", tr("b2b.import.count.error", "Errors")], ["warning", tr("b2b.import.count.warning", "Warnings")]] as const).map(([k, l]) => (
            <div key={k} className="rounded-lg border border-ops-border bg-ops-surface p-3"><dt className="text-xs font-bold text-ops-ink-muted">{l}</dt><dd className="text-2xl font-bold">{c[k]}</dd></div>
          ))}
        </dl>
        {c.error > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded border border-sig-orange-ink bg-ops-surface p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-sig-orange-ink" aria-hidden="true" />
            <p>{trn("b2b.import.errorsBanner", { one: "{n} row has errors. Nothing has been saved yet. You can fix the file and upload it again, or import the other rows and skip this one.", other: "{n} rows have errors. Nothing has been saved yet. You can fix the file and upload it again, or import the other rows and skip these.", few: "{n} rânduri au erori." }, c.error)}</p>
          </div>
        )}
      </section>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="rows-h" className="text-base font-bold">{tr("b2b.import.rows", "Rows")}</h3>
          {c.error > 0 && <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} />{tr("b2b.import.errorsOnly", "Errors only")}</label>}
        </div>
        {extra.isError && <ErrorAlert message={setupErrorMessage(extra.error, tr)} />}
        <div role="region" tabIndex={0} aria-labelledby="rows-h" className="relative hidden max-h-[28rem] overflow-auto rounded-lg border border-ops-border bg-ops-surface min-[700px]:block">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-ops-surface"><tr className="border-b border-ops-border">
              <th scope="col" className={th}>{tr("b2b.import.col.row", "Row")}</th>
              <th scope="col" className={th}>{tr("b2b.import.col.values", "Details")}</th>
              <th scope="col" className={th}>{tr("b2b.import.col.action", "Action")}</th>
              <th scope="col" className={th}>{tr("b2b.import.col.problem", "Problem")}</th>
            </tr></thead>
            <tbody className="divide-y divide-ops-border">
              {rows.map((r) => (
                <tr key={r.row} className={cn("align-top", r.action === "ERROR" && "bg-sig-vermilion-tint/30")}>
                  <th scope="row" className="px-3 py-2 text-left font-bold">{r.row}</th>
                  <td className="break-words px-3 py-2">{rowKeyValues(r.values)}</td>
                  <td className="px-3 py-2"><ActionBadge action={r.action} /></td>
                  <td className="px-3 py-2"><Problems row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 min-[700px]:hidden">
          {rows.map((r) => (
            <li key={r.row} className="rounded-lg border border-ops-border bg-ops-surface p-3">
              <dl className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2"><dt className="font-bold">{tr("b2b.import.col.row", "Row")} {r.row}</dt><dd><ActionBadge action={r.action} /></dd></div>
                <div><dt className="text-xs font-bold text-ops-ink-muted">{tr("b2b.import.col.values", "Details")}</dt><dd className="break-words">{rowKeyValues(r.values) || "-"}</dd></div>
                {(r.errors.length > 0 || r.warnings.length > 0) && <div><dt className="text-xs font-bold text-ops-ink-muted">{tr("b2b.import.col.problem", "Problem")}</dt><dd><Problems row={r} /></dd></div>}
              </dl>
            </li>
          ))}
        </ul>
        {preview.hasMoreRows && <p className="text-xs text-ops-ink-muted">{tr("b2b.import.firstRows", "Showing the first 200 rows, errors first.")}</p>}
      </div>

      {commitError && <ErrorAlert message={commitError} />}
      {reportError && <ErrorAlert message={reportError} />}
      {mode === "blocked" && <p role="status" className="text-sm font-bold">{tr("b2b.import.err.noValid", "There is nothing valid to import. Fix the file and upload it again.")}</p>}
      <div className="sticky bottom-0 flex flex-wrap justify-between gap-2 border-t border-ops-border bg-ops-canvas py-3">
        <button type="button" onClick={onBack} className={btnSecondary}>{tr("b2b.common.back", "Back")}</button>
        <div className="flex flex-wrap justify-end gap-2">
          {(c.error > 0 || c.warning > 0) && <button type="button" className={btnSecondary} onClick={() => { setReportError(null); downloadErrorReport(orgId, preview.id).catch((e) => setReportError(setupErrorMessage(e, tr))); }}><Download className="h-4 w-4" aria-hidden="true" />{tr("b2b.import.errorReport", "Error report (CSV)")}</button>}
          <button type="button" disabled={busy || !online || mode === "blocked"} onClick={() => onCommit(mode === "skip")} className={btnPrimary}>{commitLabel}</button>
        </div>
      </div>
    </div>
  );
}
