"use client";

import { useId, useState } from "react";
import { Download } from "lucide-react";
import { downloadFinanceCsv, type FinanceFilters, type FinanceKind } from "@/b2b/api/finance";
import { isB2bError } from "@/b2b/api/client";
import { useTr } from "@/b2b/setup/i18n";
import { btnClass } from "@/b2b/components/workspace/ui";

type Phase = "idle" | "busy" | "done" | "limit" | "error";

const isRateLimit = (e: unknown) => isB2bError(e) && (e.isRateLimited || e.status === 429 || e.code === "RATE_LIMITED");

/** Whole period with the current filters, saved by the browser. The server allows 20 exports an hour, so that outcome gets its own message. */
export function ExportCsvButton({ orgId, filters, online }: { orgId: string; filters: FinanceFilters & { kind: FinanceKind }; online: boolean }) {
  const { tr } = useTr();
  const [phase, setPhase] = useState<Phase>("idle");
  const reasonId = useId();
  const busy = phase === "busy";

  const run = async () => {
    setPhase("busy");
    try {
      await downloadFinanceCsv(orgId, filters);
      setPhase("done");
    } catch (e) {
      setPhase(isRateLimit(e) ? "limit" : "error");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={() => void run()} disabled={busy || !online} aria-busy={busy} aria-describedby={online ? undefined : reasonId} className={btnClass("secondary")}>
        <Download className="h-4 w-4" aria-hidden="true" />
        {busy ? tr("b2b.finance.exporting", "Preparing CSV…") : tr("b2b.finance.export", "Export CSV")}
      </button>
      {!online && <p id={reasonId} className="text-xs text-ops-ink-muted">{tr("b2b.finance.export.offline", "Reconnect to export.")}</p>}
      {phase === "done" && <p role="status" className="text-xs text-sig-green-ink">{tr("b2b.finance.export.done", "CSV downloaded")}</p>}
      {phase === "limit" && <p role="alert" className="text-xs font-bold text-sig-vermilion-ink">{tr("b2b.finance.rateLimit", "You've exported a lot. Try again shortly.")}</p>}
      {phase === "error" && <p role="alert" className="text-xs font-bold text-sig-vermilion-ink">{tr("b2b.finance.export.error", "We couldn't prepare the CSV. Try again.")}</p>}
    </div>
  );
}
