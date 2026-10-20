"use client";

import Link from "next/link";
import { BarChart3, Lock } from "lucide-react";
import { useTr } from "@/b2b/setup/i18n";
import { Banner, btnClass, Skeleton } from "@/b2b/components/workspace/ui";

export function FinanceSkeleton() {
  const { tr } = useTr();
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">{tr("b2b.finance.loading", "Loading finance figures")}</span>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-24" />)}
      </div>
      <Skeleton className="h-[320px] w-full" />
    </div>
  );
}

export function FinanceError({ onRetry }: { onRetry: () => void }) {
  const { tr } = useTr();
  return (
    <Banner tone="danger" role="alert" action={<button type="button" onClick={onRetry} className={btnClass("secondary", "text-ops-ink")}>{tr("b2b.finance.tryAgain", "Try again")}</button>}>
      <span className="font-bold">{tr("b2b.finance.error", "We couldn't load your finance figures.")}</span>
    </Banner>
  );
}

export function FinanceDenied() {
  const { tr } = useTr();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <Lock className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
      <h1 className="text-xl font-bold text-ops-ink">{tr("b2b.finance.title", "Finance")}</h1>
      <p className="text-ops-ink-muted">{tr("b2b.finance.denied", "Finance is limited to administrators and operations managers.")}</p>
    </div>
  );
}

export function OfflineBanner({ savedAt, locale }: { savedAt: number | null; locale: string }) {
  const { tr } = useTr();
  if (savedAt === null) return <Banner tone="warning" role="status">{tr("b2b.finance.offline.none", "You're offline and there are no saved figures yet. Reconnect to load them.")}</Banner>;
  const time = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(savedAt));
  return <Banner tone="warning" role="status">{tr("b2b.finance.offline", "You're offline. Showing figures saved at {time}. Reconnect to refresh, or to export.", { time })}</Banner>;
}

interface EmptyProps { icon?: React.ReactNode; title: string; body: string; children: React.ReactNode }
function EmptyPanel({ title, body, children }: EmptyProps) {
  return (
    <section className="flex flex-col items-center gap-2 rounded border border-dashed border-ops-border-strong bg-ops-surface p-8 text-center">
      <BarChart3 className="h-8 w-8 text-ops-ink-subtle" aria-hidden="true" />
      <h2 className="text-lg font-bold text-ops-ink">{title}</h2>
      <p className="max-w-md text-sm text-ops-ink-muted">{body}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function EmptyNothing({ canShowLastMonth, onLastMonth }: { canShowLastMonth: boolean; onLastMonth: () => void }) {
  const { tr } = useTr();
  return (
    <EmptyPanel title={tr("b2b.finance.empty.nothing", "No completed jobs in this period")} body={tr("b2b.finance.empty.nothingBody", "Revenue appears here when jobs are completed. Try another period, or add prices to your jobs.")}>
      {canShowLastMonth && <button type="button" onClick={onLastMonth} className={btnClass("primary")}>{tr("b2b.finance.empty.lastMonth", "Show last month")}</button>}
    </EmptyPanel>
  );
}

export function EmptyNoPrice({ orgId, jobs }: { orgId: string; jobs: number }) {
  const { tr, trn } = useTr();
  const body = trn("b2b.finance.empty.noPriceBody", {
    one: "{n} job was completed in this period, and it has no price. Add a price (and cost) to a job to see revenue and margin.",
    other: "{n} jobs were completed in this period, and none has a price. Add a price (and cost) to a job to see revenue and margin.",
  }, jobs);
  return (
    <EmptyPanel title={tr("b2b.finance.empty.noPrice", "Jobs completed, but no prices yet")} body={body}>
      <Link href={`/ops/${encodeURIComponent(orgId)}/jobs`} className={btnClass("secondary")}>{tr("b2b.finance.empty.openJobs", "Open jobs without a price")}</Link>
    </EmptyPanel>
  );
}

/** The company has not chosen a currency, so it cannot have amounts: say what to do instead of showing empty charts. */
export function EmptyNoCurrency({ orgId, canChoose }: { orgId: string; canChoose: boolean }) {
  const { tr } = useTr();
  return (
    <section aria-labelledby="fin-nocur" className="rounded-lg border border-dashed border-ops-border-strong bg-ops-surface p-6 text-center">
      <h2 id="fin-nocur" className="text-lg font-bold text-ops-ink">{tr("b2b.finance.noCurrency.title", "Choose a currency to start entering prices")}</h2>
      <p className="mx-auto mt-1 max-w-prose text-sm text-ops-ink-muted">{tr("b2b.finance.noCurrency.body", "Finance shows amounts in your company currency. It is set when you choose it in the company profile or enter the first price on a job or job type.")}</p>
      {canChoose ? <Link href={`/ops/${encodeURIComponent(orgId)}/settings/profile`} className={btnClass("primary", "mt-4")}>{tr("b2b.finance.noCurrency.action", "Choose the company currency")}</Link> : null}
    </section>
  );
}
