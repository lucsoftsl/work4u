"use client";

import { useEffect, useState } from "react";
import { computeMargin, formatMoney, formatPercent, parseMoney } from "@/b2b/lib/money";
import { useTr } from "@/b2b/setup/i18n";
import { fieldClass } from "@/b2b/components/workspace/ui";
import { CurrencyChoice } from "@/b2b/currency/CurrencyChoice";
import { describedBy, fieldId, FormField } from "./FormField";

const ANNOUNCE_DELAY_MS = 600;

interface Props {
  price: string;
  cost: string;
  /** The currency amounts are typed in: the company's, or the one picked while the company has none. */
  currency: string;
  /** The company has chosen its currency: shown as text. Otherwise a selector sits next to the amounts. */
  currencyIsSet: boolean;
  onCurrency: (code: string) => void;
  currencyError?: string | null;
  /** The price came from the job type and has not been edited. */
  priceFromType: boolean;
  priceError?: string;
  costError?: string;
  onPrice: (v: string) => void;
  onCost: (v: string) => void;
  /** Medium cards (job workspace) pass a heading id; the Create Job form uses a plain fieldset legend. */
  className?: string;
}

/** The margin line text for typed price/cost, or null while either is missing or unreadable (never a guessed zero). */
export function marginText(price: string, cost: string, currency: string, locale: string, tr: ReturnType<typeof useTr>["tr"]): { text: string; loss: boolean } | null {
  const p = parseMoney(price, locale, currency);
  const c = parseMoney(cost, locale, currency);
  if (!p.ok || !c.ok) return null;
  const m = computeMargin(p.minor, c.minor);
  if (!m) return null;
  const loss = m.margin < 0;
  const amount = formatMoney(m.margin, currency, locale);
  const base = m.pct === null
    ? tr("b2b.newJob.marginNoPct", "Margin {amount}", { amount })
    : tr("b2b.newJob.margin", "Margin {amount} · {pct}", { amount, pct: formatPercent(m.pct, locale) });
  return { text: loss ? `${base} (${tr("b2b.finance.loss", "loss")})` : base, loss };
}

/** Price charged and internal cost, with the live margin. Rendered only for viewers with finance.view (the parent decides). */
export function MoneyCard({ price, cost, currency, currencyIsSet, onCurrency, currencyError, priceFromType, priceError, costError, onPrice, onCost, className }: Props) {
  const { tr, locale } = useTr();
  const margin = marginText(price, cost, currency, locale, tr);
  // The visible line follows every keystroke; the screen reader hears it once typing pauses.
  const [spoken, setSpoken] = useState(margin?.text ?? "");
  useEffect(() => {
    const id = setTimeout(() => setSpoken(margin?.text ?? ""), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [margin?.text]);

  return (
    <fieldset className={className ?? "min-w-0 space-y-3 rounded border border-ops-border bg-ops-surface p-4"}>
      <legend className="px-1 text-sm font-bold text-ops-ink">{tr("b2b.newJob.money", "Money")}</legend>
      <CurrencyChoice id={fieldId("currency")} isSet={currencyIsSet} currency={currency} onPick={onCurrency} error={currencyError} className="sm:max-w-sm" />
      <FormField name="price" label={tr("b2b.newJob.price", "Price charged to the client ({cur})", { cur: currency })} error={priceError} hint={priceFromType ? tr("b2b.newJob.priceFromType", "From the job type. You can change it.") : tr("b2b.newJob.priceHint", "Optional.")}>
        <input id={fieldId("price")} inputMode="decimal" autoComplete="off" value={price} onChange={(e) => onPrice(e.target.value)} aria-invalid={!!priceError} aria-describedby={describedBy("price", { error: priceError, hint: true })} className={`${fieldClass} min-h-[44px] sm:w-56`} />
      </FormField>
      <FormField name="cost" label={tr("b2b.newJob.cost", "Cost to you ({cur})", { cur: currency })} error={costError} hint={tr("b2b.newJob.costHint", "Labour, parts, travel. Optional. Only people with Finance access see it.")}>
        <input id={fieldId("cost")} inputMode="decimal" autoComplete="off" value={cost} onChange={(e) => onCost(e.target.value)} aria-invalid={!!costError} aria-describedby={describedBy("cost", { error: costError, hint: true })} className={`${fieldClass} min-h-[44px] sm:w-56`} />
      </FormField>
      <p aria-hidden="true" className={margin ? `text-sm font-bold ${margin.loss ? "text-sig-vermilion-ink" : "text-sig-green-ink"}` : "text-sm text-ops-ink-muted"}>
        {margin?.text ?? tr("b2b.newJob.marginBlank", "Margin appears when price and cost are filled in.")}
      </p>
      <p role="status" className="sr-only">{spoken}</p>
    </fieldset>
  );
}
