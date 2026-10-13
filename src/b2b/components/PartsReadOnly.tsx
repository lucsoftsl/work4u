"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { listParts, qk } from "@/b2b/api/endpoints";
import { isB2bError } from "@/b2b/api/client";
import { totalsByName } from "@/b2b/lib/parts";

const qty = (q: number) => String(Math.round(q * 100) / 100);

/** Parts the technician recorded, read-only for dispatchers and reviewers. Honest empty / error / migration states. */
export function PartsReadOnly({ orgId, jobId, heading = "h3" }: { orgId: string; jobId: string; heading?: "h2" | "h3" | "h4" }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: qk.parts(orgId, jobId), queryFn: () => listParts(orgId, jobId), staleTime: 15_000, retry: false });
  const H = heading;
  const items = q.data?.items ?? [];
  const totals = totalsByName(items);
  const pending = q.isError && isB2bError(q.error) && q.error.isMigrationPending;
  return (
    <div className="space-y-2 text-sm">
      <H className="font-bold">{t("b2b.tech.parts.review.title", "Parts used")}{q.isSuccess ? ` (${items.length})` : ""}</H>
      {q.isPending ? <p role="status">{t("b2b.tech.parts.review.loading", "Loading parts…")}</p>
        : pending ? <p>{t("b2b.tech.parts.review.unavailable", "Parts are not available yet for this workspace.")}</p>
        : q.isError ? (
          <p role="alert">{t("b2b.tech.parts.loadError", "Couldn't load parts.")} <button type="button" onClick={() => void q.refetch()} className="min-h-[44px] font-bold underline">{t("b2b.common.retry", "Retry")}</button></p>
        ) : items.length === 0 ? <p>{t("b2b.tech.parts.review.empty", "No parts recorded.")}</p> : (
          <>
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-ops-ink-subtle"><tr><th scope="col" className="py-1 pr-2">{t("b2b.tech.parts.name", "Part name")}</th><th scope="col" className="py-1 pr-2">{t("b2b.tech.parts.qty", "Quantity")}</th><th scope="col" className="py-1">SKU</th></tr></thead>
              <tbody className="divide-y divide-ops-border">
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-2"><span className="font-bold">{p.name}</span>{p.note ? <span className="block text-ops-ink-muted">{p.note}</span> : null}</td>
                    <td className="py-1.5 pr-2 font-mono">×{qty(p.quantity)}{p.unit ? ` ${p.unit}` : ""}</td>
                    <td className="py-1.5 font-mono">{p.sku ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totals.length !== items.length ? (
              <p className="text-ops-ink-muted">{t("b2b.tech.parts.review.totals", "Totals")}: {totals.map((x) => `${x.name} ×${qty(x.quantity)}${x.unit ? ` ${x.unit}` : ""}`).join(", ")}</p>
            ) : null}
          </>
        )}
    </div>
  );
}
