"use client";

import { useId } from "react";
import CurrencyInput from "react-currency-input-field";
import { CurrencySelector } from "@/components/CurrencySelector";
import { FieldShell } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

interface MoneyFieldProps {
  id: string;
  label: string;
  currencyLabel: string;
  amount: string;
  onAmountChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  required?: boolean;
}

/** Positive-only amount input (no negatives) next to a labelled currency listbox. */
export function MoneyField({ id, label, currencyLabel, amount, onAmountChange, currency, onCurrencyChange, error, hint, required }: MoneyFieldProps) {
  const currencyId = `${useId()}-currency`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,13rem)]">
      <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
        <CurrencyInput
          id={id}
          name={id}
          value={amount}
          onValueChange={(value) => onAmountChange(value ?? "")}
          decimalsLimit={2}
          allowNegativeValue={false}
          inputMode="decimal"
          placeholder="0"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-[48px] w-full rounded-control border bg-surface px-3 py-2.5 text-body tabular-nums text-ink placeholder:text-ink-subtle transition-colors duration-fast",
            "hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus",
            error ? "border-danger" : "border-line-strong"
          )}
        />
      </FieldShell>
      <CurrencySelector id={currencyId} label={currencyLabel} value={currency} onChange={onCurrencyChange} />
    </div>
  );
}
