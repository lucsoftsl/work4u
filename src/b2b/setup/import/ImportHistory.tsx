"use client";

import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/b2b/context/OrgContext";
import { listImports, sk } from "../api";
import { useTr } from "../i18n";
import type { Kind } from "./importLogic";

/** Past imports of this kind: file name, date, counts, status. A failure to load is not worth an alert here. */
export function ImportHistory({ kind }: { kind: Kind }) {
  const { orgId } = useOrg();
  const { tr, trn, locale } = useTr();
  const q = useQuery({ queryKey: sk.imports(orgId, kind), queryFn: () => listImports(orgId, kind), retry: false });
  const items = (q.data?.items ?? []).filter((i) => i.status !== "DISCARDED" && i.status !== "VALIDATED" && i.status !== "UPLOADED");
  if (items.length === 0) return null;
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const status = (s: string) => s === "DONE" ? tr("b2b.import.status.done", "Done") : s === "FAILED" ? tr("b2b.import.status.failed", "Failed") : s === "COMMITTING" ? tr("b2b.import.status.running", "Running") : s;
  return (
    <section aria-labelledby="import-history-h" className="space-y-2">
      <h2 id="import-history-h" className="text-lg font-bold text-ops-ink">{tr("b2b.import.history", "Earlier imports")}</h2>
      <ul className="divide-y divide-ops-border rounded-lg border border-ops-border bg-ops-surface">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-2 text-sm">
            <span className="min-w-0 break-all font-bold">{i.fileName ?? "-"}</span>
            <span className="text-ops-ink-muted">{fmt.format(new Date(i.committedAt ?? i.createdAt))}</span>
            <span>{tr("b2b.import.historyCounts", "{c} created, {u} updated, {e}", { c: i.counts.create, u: i.counts.update, e: trn("b2b.import.errorsCount", { one: "{n} error", other: "{n} errors" }, i.counts.error) })}</span>
            <span className="font-bold">{status(i.status)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
