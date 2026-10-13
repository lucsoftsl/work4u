"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const fieldId = (key: string) => `nj-${key}`;
export const errorId = (key: string) => `nj-${key}-err`;
export const hintId = (key: string) => `nj-${key}-hint`;

/** Label + control + hint + inline error. The control gets aria-describedby from `describedBy(key, …)`. */
export function describedBy(key: string, opts: { error?: string; hint?: boolean }): string | undefined {
  const ids = [opts.error ? errorId(key) : "", opts.hint ? hintId(key) : ""].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FormField({ name, label, required, error, hint, children }: { name: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId(name)} className="block text-sm font-bold text-ops-ink">
        {label}{required ? <span aria-hidden="true" className="text-sig-vermilion-ink"> *</span> : null}
      </label>
      {children}
      {hint ? <p id={hintId(name)} className="text-xs text-ops-ink-muted">{hint}</p> : null}
      {error ? <p id={errorId(name)} className="text-xs font-bold text-sig-vermilion-ink">{error}</p> : null}
    </div>
  );
}

/** Group of controls (radios/checkboxes) with a legend and an inline error. */
export function FormGroup({ name, legend, required, error, hint, className, children }: { name: string; legend: string; required?: boolean; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <fieldset id={fieldId(name)} tabIndex={-1} aria-describedby={describedBy(name, { error, hint: !!hint })} aria-invalid={error ? true : undefined} className={cn("space-y-1 focus:outline-none", className)}>
      <legend className="text-sm font-bold text-ops-ink">{legend}{required ? <span aria-hidden="true" className="text-sig-vermilion-ink"> *</span> : null}</legend>
      {hint ? <p id={hintId(name)} className="text-xs text-ops-ink-muted">{hint}</p> : null}
      {children}
      {error ? <p id={errorId(name)} className="text-xs font-bold text-sig-vermilion-ink">{error}</p> : null}
    </fieldset>
  );
}
