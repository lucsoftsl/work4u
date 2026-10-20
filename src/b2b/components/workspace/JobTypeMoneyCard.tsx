"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { isB2bError } from "@/b2b/api/client";
import { useToast } from "@/components/ui/Toast";
import { patchJob } from "@/b2b/api/endpoints";
import type { JobWorkspace } from "@/b2b/api/types";
import { useOrg } from "@/b2b/context/OrgContext";
import { detailsFromJob, detailsPatch, validateDetails, type DetailsForm } from "@/b2b/lib/job-details";
import { formatMoney, formatPercent } from "@/b2b/lib/money";
import { useMoney } from "@/b2b/lib/useMoney";
import { describeB2bError } from "@/b2b/lib/workspace";
import { JOB_STATUS_META } from "@/b2b/lib/status";
import { formErrorsFrom } from "@/b2b/setup/errors";
import { useTranslation } from "@/lib/i18n";
import { useTr } from "@/b2b/setup/i18n";
import { useActiveJobTypes } from "@/b2b/setup/jobtypes/useJobTypes";
import { useFocusFirstInvalid } from "@/b2b/setup/useFocusFirstInvalid";
import { MoneyCard } from "@/b2b/components/jobs/new/MoneyCard";
import { Banner, btnClass, Card, fieldClass } from "./ui";
import { useJobCache } from "./useJobCache";

const LOCKED = new Set(["CLOSED", "CANCELLED"]);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-ops-border py-2 text-sm last:border-0">
      <dt className="text-ops-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-ops-ink">{children}</dd>
    </div>
  );
}

/**
 * The job's type and, for Administrators and Operations Managers (finance.view), its price, cost and margin. Without finance.view the money
 * rows do not exist (the API leaves the keys out too). Editing is online-only, with the job's version.
 */
export function JobTypeMoneyCard({ job }: { job: JobWorkspace }) {
  const { tr, locale } = useTr();
  const { t } = useTranslation();
  const { orgId, can } = useOrg();
  const { finance, currency, isSet: currencyIsSet, chooseCurrency, pick: pickCurrency, selected: selectedCurrency, refreshCompany } = useMoney();
  const toast = useToast();
  const { merge, refresh } = useJobCache(orgId, job.id);
  const opts = useMemo(() => ({ finance, locale, currency, chooseCurrency }), [finance, locale, currency, chooseCurrency]);
  const types = useActiveJobTypes(orgId, can("job.update"));
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DetailsForm>(() => detailsFromJob(job, opts));
  const [touched, setTouched] = useState(false);
  // The job was closed or cancelled in another tab while this form was open: say so, once the card has caught up.
  const [notice, setNotice] = useState<string | null>(null);
  const { ref: formRef, focusFirstInvalid } = useFocusFirstInvalid<HTMLFormElement>();
  const canEdit = can("job.update") && !LOCKED.has(job.status);

  const save = useMutation({
    mutationFn: () => patchJob(orgId, job.id, job.version, detailsPatch(form, job, opts)),
    onSuccess: (updated) => {
      merge(updated);
      if (chooseCurrency) refreshCompany(); // the first amount chose the company currency
      setEditing(false);
      toast.push({ message: tr("b2b.job.details.saved", "Saved."), tone: "success" });
    },
    onError: (e) => {
      if (isB2bError(e) && e.code === "CURRENCY_REQUIRED") {
        // Nothing was saved: ask again with the API's suggestion pre-selected.
        const suggested = typeof e.body.details === "object" && e.body.details ? (e.body.details as { effectiveCurrency?: unknown }).effectiveCurrency : e.body.effectiveCurrency;
        const code = typeof suggested === "string" ? suggested : selectedCurrency;
        if (typeof suggested === "string") pickCurrency(suggested);
        refreshCompany();
        setNotice(tr("b2b.currency.required", "Choose the company currency before saving the first amount. {currency} is pre-selected.", { currency: code }));
        return;
      }
      if (isB2bError(e) && e.code === "CURRENCY_MISMATCH") {
        const mine = typeof e.body.details === "object" && e.body.details ? (e.body.details as { currency?: unknown }).currency : e.body.currency;
        setNotice(tr("b2b.currency.mismatch", "The company currency is {currency}, so the page was out of date. It has been refreshed; check the amounts and save again.", { currency: typeof mine === "string" ? mine : currency }));
        refreshCompany();
        return;
      }
      if (!isB2bError(e) || e.code !== "INVALID_TRANSITION") return;
      const now = typeof e.body.details === "object" && e.body.details ? (e.body.details as { currentStatus?: unknown }).currentStatus : e.currentStatus;
      const label = typeof now === "string" && now in JOB_STATUS_META ? JOB_STATUS_META[now as keyof typeof JOB_STATUS_META].label : null;
      setNotice(label
        ? tr("b2b.job.details.statusChanged", "This job is now {status}, so its type and amounts can no longer be changed. Nothing was saved.", { status: label })
        : tr("b2b.job.details.statusChangedAny", "This job was closed or cancelled in the meantime, so its type and amounts can no longer be changed. Nothing was saved."));
      setEditing(false);
      void refresh(); // the card then hides its Edit button for the new status
    },
  });
  const server = formErrorsFrom(save.error, { keys: ["price", "cost", "jobTypeId"] as const }, tr, (e) => describeB2bError(e, { t, locale }).message);
  const problems = touched ? validateDetails(form, opts) : {};
  const moneyText = (k: "price" | "cost"): string | undefined => {
    if (server.fields[k]) return tr("b2b.newJob.err.moneyRange", "Enter an amount from 0 to 10,000,000.00.");
    if (problems[k]) return problems[k] === "moneyRange" ? tr("b2b.newJob.err.moneyRange", "Enter an amount from 0 to 10,000,000.00.") : tr("b2b.newJob.err.money", "Enter an amount like 450.00.");
    return undefined;
  };

  const open = () => { save.reset(); setNotice(null); setForm(detailsFromJob(job, opts)); setTouched(false); setEditing(true); };
  const typeName = job.jobTypeName ?? job.jobType?.name ?? null;
  const archived = job.jobType?.archived ?? false;
  const margin = finance && typeof job.margin === "number" ? job.margin : null;
  const loss = margin !== null && margin < 0;
  const dash = <span aria-label={tr("b2b.job.details.notSet", "Not set")}>–</span>;
  const unset = <span className="text-ops-ink-subtle">{tr("b2b.job.details.notSet", "Not set")}</span>;
  const title = finance ? tr("b2b.job.details.titleMoney", "Job type and money") : tr("b2b.job.details.title", "Job type");
  const currentArchived = job.jobType && !types.data?.some((x) => x.id === job.jobType!.id) ? job.jobType : null;

  return (
    <Card title={title} icon={<Tag className="h-4 w-4" aria-hidden="true" />}
      action={canEdit && !editing ? <button type="button" onClick={open} className={btnClass("secondary", "px-3")}>{tr("b2b.job.details.edit", "Edit")}</button> : undefined}>
      {notice ? <div className="mb-3"><Banner tone="warning" role="alert">{notice}</Banner></div> : null}
      {!editing ? (
        <dl>
          <Row label={tr("b2b.newJob.type", "Job type")}>
            {typeName ? <>{typeName}{archived ? <span className="ml-2 rounded border border-dashed border-ops-border-strong px-1.5 text-xs text-ops-ink-muted">{tr("b2b.jobTypes.archivedBadge", "Archived")}</span> : null}</> : unset}
          </Row>
          {finance ? (
            <>
              <Row label={tr("b2b.finance.col.price", "Price")}>{typeof job.price === "number" ? formatMoney(job.price, job.currency ?? currency, locale) : unset}</Row>
              <Row label={tr("b2b.finance.kpi.cost", "Cost")}>{typeof job.cost === "number" ? formatMoney(job.cost, job.currency ?? currency, locale) : unset}</Row>
              <Row label={tr("b2b.finance.kpi.margin", "Margin")}>
                {margin === null ? dash : (
                  <span className={loss ? "font-bold text-sig-vermilion-ink" : "text-sig-green-ink"}>
                    {formatMoney(margin, job.currency ?? currency, locale)}
                    {typeof job.marginPct === "number" ? ` · ${formatPercent(job.marginPct, locale)}` : ""}
                    {loss ? ` (${tr("b2b.finance.loss", "loss")})` : ""}
                  </span>
                )}
              </Row>
            </>
          ) : null}
        </dl>
      ) : (
        <form ref={formRef} noValidate className="space-y-3" onSubmit={(e) => {
          e.preventDefault(); setTouched(true);
          if (Object.keys(validateDetails(form, opts)).length > 0) { focusFirstInvalid(); return; }
          if (Object.keys(detailsPatch(form, job, opts)).length === 0) { setEditing(false); return; }
          save.mutate();
        }}>
          <div>
            <label htmlFor="jd-type" className="mb-1 block text-sm font-bold text-ops-ink">{tr("b2b.newJob.type", "Job type")}</label>
            <select id="jd-type" value={form.jobTypeId} onChange={(e) => setForm((f) => ({ ...f, jobTypeId: e.target.value }))} className={`${fieldClass} min-h-[44px]`}>
              <option value="">{tr("b2b.job.details.noType", "No job type")}</option>
              {currentArchived ? <option value={currentArchived.id}>{currentArchived.name} ({tr("b2b.jobTypes.archivedBadge", "Archived").toLowerCase()})</option> : null}
              {(types.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          {finance ? (
            <MoneyCard
              className="min-w-0 space-y-3 rounded border border-ops-border p-3"
              price={form.price} cost={form.cost} currency={currency} currencyIsSet={currencyIsSet} onCurrency={pickCurrency} priceFromType={false}
              priceError={moneyText("price")} costError={moneyText("cost")}
              onPrice={(v) => setForm((f) => ({ ...f, price: v }))} onCost={(v) => setForm((f) => ({ ...f, cost: v }))}
            />
          ) : null}
          {save.isError && server.banner ? <Banner tone="danger" role="alert">{server.banner}</Banner> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={save.isPending} className={btnClass("secondary")}>{tr("b2b.common.cancel", "Cancel")}</button>
            <button type="submit" disabled={save.isPending} aria-busy={save.isPending || undefined} className={btnClass("primary")}>{save.isPending ? tr("b2b.common.saving", "Saving…") : tr("b2b.common.save", "Save")}</button>
          </div>
        </form>
      )}
    </Card>
  );
}
