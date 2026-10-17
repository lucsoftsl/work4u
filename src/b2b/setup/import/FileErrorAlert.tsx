"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { btnPrimary, inputCls } from "@/b2b/components/catalog/ui";
import { useTr } from "../i18n";
import { ENCODINGS, type FileErrorCode } from "./importLogic";

/** One sentence per file-level failure (design §5). ENCODING_NOT_UTF8 adds an encoding choice that resends the file. */
export function FileErrorAlert({ code, busy, onRetryEncoding }: { code: FileErrorCode; busy: boolean; onRetryEncoding: (enc: string) => void }) {
  const { tr } = useTr();
  const [enc, setEnc] = useState("windows-1252");
  const text: Record<FileErrorCode, string> = {
    UNSUPPORTED_FILE_TYPE: tr("b2b.import.err.xlsx", "That's an Excel file, not a CSV."),
    ENCODING_NOT_UTF8: tr("b2b.import.err.notUtf8", "We couldn't read that file as UTF-8. Choose the file's encoding and try again."),
    TOO_MANY_ROWS: tr("b2b.import.err.tooManyRows", "That file has more than 5,000 rows. Split it and import the parts one after the other."),
    TOO_MANY_COLUMNS: tr("b2b.import.err.tooManyColumns", "That file has more than 50 columns. Remove the columns you don't need."),
    TOO_LARGE: tr("b2b.import.err.tooLarge", "That file is too big (limit 5 MB)."),
    EMPTY_FILE: tr("b2b.import.err.empty", "That file is empty."),
    NO_HEADER: tr("b2b.import.err.noHeader", "The first row must contain the column names."),
    UNTERMINATED_QUOTE: tr("b2b.import.err.quote", "A quoted value is never closed. Check for a stray quote mark and upload again."),
    FIELD_TOO_LONG: tr("b2b.import.err.fieldTooLong", "A cell is longer than 2,000 characters. Shorten it and upload again."),
    MISSING_COLUMNS: tr("b2b.import.err.missingColumns", "Some required columns are missing."),
  };
  const encLabel: Record<string, string> = { "utf-8": "UTF-8", "windows-1252": "Windows-1252", "windows-1250": "Windows-1250", "iso-8859-2": "ISO-8859-2" };
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-sig-vermilion-ink bg-ops-surface p-4">
      <p className="flex items-start gap-2 text-sm text-ops-ink"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-sig-vermilion-ink" aria-hidden="true" /><span>{text[code]}</span></p>
      {code === "ENCODING_NOT_UTF8" && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="import-enc" className="block text-sm font-bold">{tr("b2b.import.encoding", "File encoding")}</label>
            <select id="import-enc" value={enc} onChange={(e) => setEnc(e.target.value)} className={`${inputCls} w-auto`}>
              {ENCODINGS.map((e) => <option key={e} value={e}>{encLabel[e]}</option>)}
            </select>
          </div>
          <button type="button" disabled={busy} onClick={() => onRetryEncoding(enc)} className={btnPrimary}>{tr("b2b.import.tryEncoding", "Try again with this encoding")}</button>
        </div>
      )}
    </div>
  );
}
