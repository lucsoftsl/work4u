"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Plus, Search, UserRound, UsersRound } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { CUSTOMERS_PAGE_SIZE, ck, listCustomersPage } from "@/b2b/api/catalog";
import { JobsPager } from "@/b2b/components/jobs/JobsPager";
import { customersHref, parsePage } from "@/b2b/lib/paging";
import { useOrg } from "@/b2b/context/OrgContext";
import { catalogActions, catalogErrorMessage } from "@/b2b/lib/catalog";
import { EmptyState } from "@/b2b/components/EmptyState";
import { ErrorAlert, ListSkeleton, btnPrimary, inputCls } from "@/b2b/components/catalog/ui";
import { CustomerDialog } from "./CustomerDialog";

const DEBOUNCE_MS = 300;

export function CustomersView() {
  const { t } = useTranslation();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const urlQ = sp.get("q") ?? "";
  const page = parsePage(sp.get("page"));
  const actions = catalogActions(org.can);
  const [text, setText] = useState(urlQ);
  const [creating, setCreating] = useState(false);

  // Debounce typing into the URL (q is the source of truth for the query).
  useEffect(() => {
    if (text.trim() === urlQ) return;
    const id = setTimeout(() => router.replace(customersHref(pathname, text.trim(), 1), { scroll: false }), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, urlQ, router, pathname]);

  const list = useQuery({
    queryKey: ck.customers(org.orgId, urlQ, page),
    queryFn: ({ signal }) => listCustomersPage(org.orgId, { q: urlQ, offset: (page - 1) * CUSTOMERS_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });
  const base = `/ops/${encodeURIComponent(org.orgId)}/customers`;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ops-ink">{t("b2b.customers.title", "Customers")}</h1>
        {actions.createCustomer && <button type="button" onClick={() => setCreating(true)} className={btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" />{t("b2b.customers.new", "New customer")}</button>}
      </div>

      <div className="relative">
        <label htmlFor="customer-q" className="sr-only">{t("b2b.customers.search", "Search customers")}</label>
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ops-ink-subtle" aria-hidden="true" />
        <input id="customer-q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("b2b.customers.search", "Search customers")} className={`${inputCls} pl-9`} />
      </div>

      <div aria-live="polite">
        {list.isPending ? <ListSkeleton /> : list.isError && !list.data ? (
          <ErrorAlert message={catalogErrorMessage(list.error, "customer")} onRetry={() => void list.refetch()} />
        ) : list.data && list.data.items.length === 0 && page <= 1 ? (
          urlQ ? (
            <EmptyState icon={Search} title={t("b2b.customers.noMatch", "No customers match your search")} body={t("b2b.customers.noMatchBody", "Check the spelling or clear the search.")} action={<button type="button" onClick={() => setText("")} className={btnPrimary}>{t("b2b.customers.clear", "Clear search")}</button>} />
          ) : (
            <EmptyState
              icon={UsersRound}
              title={t("b2b.customers.empty", "No customers yet")}
              body={actions.createCustomer ? t("b2b.customers.emptyManager", "Add a customer and their service locations so jobs can be created for them.") : t("b2b.customers.emptyViewer", "No customers have been added. Ask a manager with customer access to add them.")}
              action={actions.createCustomer ? <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>{t("b2b.customers.new", "New customer")}</button> : undefined}
            />
          )
        ) : (
          <ul className="divide-y divide-ops-border rounded-lg border border-ops-border bg-ops-surface">
            {list.data?.items.map((c) => {
              const Icon = c.type === "PERSON" ? UserRound : Building2;
              return (
                <li key={c.id}>
                  <Link href={`${base}/${encodeURIComponent(c.id)}`} className="flex min-h-[56px] items-center gap-3 px-4 py-2 hover:bg-ops-canvas focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2">
                    <Icon className="h-5 w-5 shrink-0 text-ops-ink-subtle" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ops-ink">{c.name}</span>
                      <span className="block truncate text-xs text-ops-ink-muted">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ops-ink-subtle" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {list.data && (list.data.items.length > 0 || page > 1) && (
        <JobsPager page={page} pageSize={CUSTOMERS_PAGE_SIZE} count={list.data.items.length} total={list.data.total} hasNext={list.data.hasMore}
          onPage={(p) => router.replace(customersHref(pathname, urlQ, p), { scroll: false })} />
      )}
      {creating && <CustomerDialog orgId={org.orgId} onClose={() => setCreating(false)} onSaved={(c) => c?.id && router.push(`${base}/${encodeURIComponent(c.id)}`)} />}
    </div>
  );
}
