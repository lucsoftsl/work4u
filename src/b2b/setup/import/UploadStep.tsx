"use client";

import { useRef, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { useOrg } from "@/b2b/context/OrgContext";
import { ErrorAlert, btnPrimary, btnSecondary } from "@/b2b/components/catalog/ui";
import { downloadTemplate } from "../api";
import { setupErrorMessage } from "../errors";
import { useTr } from "../i18n";
import { FileErrorAlert } from "./FileErrorAlert";
import { ImportHistory } from "./ImportHistory";
import type { FileErrorCode, Kind } from "./importLogic";

interface Props { kind: Kind; busy: boolean; online: boolean; fileError: FileErrorCode | null; message: string | null; file: File | null; onFile: (f: File) => void; onEncoding: (enc: string) => void }

export function UploadStep({ kind, busy, online, fileError, message, file, onFile, onEncoding }: Props) {
  const { tr } = useTr();
  const { orgId } = useOrg();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const pick = (f: File | undefined) => { if (f) onFile(f); };
  return (
    <div className="space-y-4">
      <section aria-labelledby="upload-h" className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 id="upload-h" className="text-lg font-bold">{tr("b2b.import.upload.title", "Choose your CSV file")}</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (online && !busy) pick(e.dataTransfer.files[0]); }}
          className={`flex flex-col items-start gap-3 rounded border-2 border-dashed p-4 ${drag ? "border-ops-ink bg-ops-canvas" : "border-ops-border-strong"}`}
        >
          <input ref={input} id="import-file" type="file" aria-label={tr("b2b.import.chooseFile", "Choose CSV file")} tabIndex={-1} accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" disabled={busy || !online} onClick={() => input.current?.click()} className={btnPrimary}><FileUp className="h-4 w-4" aria-hidden="true" />{tr("b2b.import.chooseFile", "Choose CSV file")}</button>
          <p className="text-sm text-ops-ink-muted">{tr("b2b.import.dragHint", "or drag a file here")}</p>
          {file && <p className="break-all text-sm font-bold" role="status">{busy ? tr("b2b.import.checking", "Checking your file…") : file.name}</p>}
        </div>
        <p className="text-sm text-ops-ink-muted">{tr("b2b.import.limits", "CSV only · up to 5 MB · up to 5,000 rows · UTF-8 · comma, semicolon or tab separated")}</p>
        <p className="text-sm text-ops-ink-muted">{tr("b2b.import.excelHelp", "Using Excel? Choose File → Save as → CSV UTF-8. Excel files (.xlsx) can't be imported.")}</p>
        <button type="button" onClick={() => { setTplError(null); downloadTemplate(orgId, kind).catch((e) => setTplError(setupErrorMessage(e, tr))); }} className={btnSecondary}><Download className="h-4 w-4" aria-hidden="true" />{tr("b2b.import.template", "Download the CSV template")}</button>
        {tplError && <ErrorAlert message={tplError} />}
        {!online && <p role="status" className="text-sm font-bold">{tr("b2b.import.offline", "You're offline. Reconnect to import.")}</p>}
      </section>
      {fileError && <FileErrorAlert code={fileError} busy={busy} onRetryEncoding={onEncoding} />}
      {message && <ErrorAlert message={message} />}
      <ImportHistory kind={kind} />
    </div>
  );
}
