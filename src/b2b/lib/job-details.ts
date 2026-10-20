import type { Job } from "@/b2b/api/types";
import { moneyToInput, parseMoney } from "./money";

// The "Job type and money" card of an existing job (aa659608, ce3173a7): what can still be changed after creation.

export interface DetailsForm { jobTypeId: string; price: string; cost: string }
interface Opts { finance: boolean; locale: string; /** Digits of the amounts: the company's currency, or the one picked while it has none. */ currency?: string | null; /** The company has no currency yet: send this one with the first amount. */ chooseCurrency?: string | null }
export type DetailsErrors = Partial<Record<"price" | "cost", "invalidMoney" | "moneyRange">>;

export const detailsFromJob = (job: Pick<Job, "jobTypeId" | "price" | "cost">, o: Opts): DetailsForm => ({
  jobTypeId: job.jobTypeId ?? "",
  price: o.finance ? moneyToInput(job.price, o.locale, o.currency) : "",
  cost: o.finance ? moneyToInput(job.cost, o.locale, o.currency) : "",
});

export function validateDetails(f: DetailsForm, o: Opts): DetailsErrors {
  const e: DetailsErrors = {};
  if (!o.finance) return e;
  for (const k of ["price", "cost"] as const) {
    const r = parseMoney(f[k], o.locale, o.currency);
    if (!r.ok) e[k] = r.reason === "range" ? "moneyRange" : "invalidMoney";
  }
  return e;
}

/** PATCH /jobs/:id body: only what changed; null clears. Money is never sent by (or read for) a viewer without finance.view. */
export function detailsPatch(f: DetailsForm, job: Pick<Job, "jobTypeId" | "price" | "cost">, o: Opts): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (f.jobTypeId !== (job.jobTypeId ?? "")) patch.jobTypeId = f.jobTypeId || null;
  if (o.finance) {
    for (const k of ["price", "cost"] as const) {
      const r = parseMoney(f[k], o.locale, o.currency);
      const next = r.ok ? r.minor : null;
      if (next !== (job[k] ?? null)) patch[k] = next;
    }
    if (o.chooseCurrency && ((patch.price ?? null) !== null || (patch.cost ?? null) !== null)) patch.currency = o.chooseCurrency;
  }
  return patch;
}
