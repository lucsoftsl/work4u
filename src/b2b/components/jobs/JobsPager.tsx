"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { pageRange, pageTokens, totalPages } from "@/b2b/lib/paging";

const BTN = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded border border-ops-border-strong px-3 text-sm font-bold text-ops-ink enabled:hover:bg-ops-canvas disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ops-ink";

interface Props { page: number; pageSize: number; count: number; total?: number; hasNext: boolean; disabled?: boolean; onPage: (p: number) => void }

/** "Showing x–y of N" + numbered pages when the API gives a total; Previous/Next otherwise. */
export function JobsPager({ page, pageSize, count, total, hasNext, disabled, onPage }: Props) {
  const { t } = useTranslation();
  const range = pageRange(page, pageSize, count);
  const pages = total === undefined ? null : totalPages(total, pageSize);
  return (
    <nav aria-label={t("b2b.jobs.pagination", "Pagination")} className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} className={BTN}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t("b2b.jobs.prev", "Previous")}
      </button>
      {pages && total !== undefined ? (
        <>
          <p className="order-last w-full text-center text-sm text-ops-ink-muted sm:order-none sm:w-auto" role="status">
            {range ? <>{t("b2b.jobs.showing", "Showing")} <span className="font-mono">{range.from}–{range.to}</span> {t("b2b.jobs.of", "of")} <span className="font-mono">{total}</span></> : <span className="font-mono">{total}</span>}
          </p>
          <ul className="hidden items-center gap-1 md:flex">
            {pageTokens(page, pages).map((tok, i) =>
              tok === "gap" ? (
                <li key={`g${i}`} aria-hidden="true" className="px-1 text-ops-ink-muted">…</li>
              ) : (
                <li key={tok}>
                  <button type="button" disabled={disabled} onClick={() => onPage(tok)} aria-current={tok === page ? "page" : undefined} aria-label={`${t("b2b.jobs.page", "Page")} ${tok}`} className={cn(BTN, "font-mono", tok === page && "border-ops-ink bg-ops-ink text-white")}>{tok}</button>
                </li>
              )
            )}
          </ul>
        </>
      ) : (
        <span className="text-sm text-ops-ink-muted">{t("b2b.jobs.page", "Page")} <span className="font-mono">{page}</span></span>
      )}
      <button type="button" disabled={disabled || !hasNext} onClick={() => onPage(page + 1)} className={BTN}>
        {t("b2b.jobs.next", "Next")}<ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
