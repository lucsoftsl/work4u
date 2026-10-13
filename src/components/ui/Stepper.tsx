"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { stepProgress } from "@/lib/wizard";
import { cn } from "@/lib/utils";

export interface StepperStep {
  title: string;
  description?: string;
}

interface StepperProps {
  steps: readonly StepperStep[];
  /** 1-based current step. */
  current: number;
  /** Accessible name of the navigation (e.g. "Post a job progress"). */
  label: string;
  className?: string;
}

/**
 * Wizard progress. Below lg: compact "Step 2 of 3" + title + progress bar.
 * From lg: a side stepper (ol, aria-current="step" on the active item).
 */
export function Stepper({ steps, current, label, className }: StepperProps) {
  const { t } = useTranslation();
  const total = steps.length;
  const active = steps[current - 1];

  return (
    <nav aria-label={label} className={className}>
      <div className="lg:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-label text-ink-muted tabular-nums">
            {t("dashboard.step")} {current} {t("common.of")} {total}
          </p>
          <p className="min-w-0 truncate text-label text-primary">{active?.title}</p>
        </div>
        <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-control bg-sunken">
          <div
            className="h-full w-full origin-left bg-primary transition-transform duration-normal ease-out"
            style={{ transform: `scaleX(${stepProgress(current, total) / 100})` }}
          />
        </div>
      </div>

      <div className="hidden rounded-card border border-line bg-surface p-5 shadow-stamp lg:block">
        <p className="mb-4 text-micro uppercase text-ink-muted">{label}</p>
        <ol className="space-y-2">
          {steps.map((step, index) => {
            const number = index + 1;
            const isActive = number === current;
            const isDone = number < current;
            return (
              <li
                key={step.title}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-control border-l-4 px-3 py-3",
                  isActive ? "border-primary bg-primary-soft" : "border-transparent"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label tabular-nums",
                    isActive ? "bg-primary text-on-fill" : isDone ? "bg-primary-soft text-primary" : "bg-sunken text-ink-muted"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : number}
                </span>
                <span className="min-w-0">
                  <span className="block text-micro uppercase text-ink-muted">
                    {t("dashboard.step")} {number}
                    {isDone ? <span className="sr-only"> ({t("wizard.stepDone")})</span> : null}
                  </span>
                  <span className={cn("block text-body", isActive ? "font-bold text-primary" : "text-ink")}>{step.title}</span>
                  {step.description ? <span className="mt-0.5 block text-caption text-ink-muted">{step.description}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/**
 * Back / Continue bar. Sticky above the mobile tab bar below md; inline with a top rule from md.
 * Put it inside the <form>, last.
 */
export function WizardActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 -mx-[var(--gutter)] mt-8 flex items-center justify-between gap-3 border-t border-line bg-surface px-[var(--gutter)] py-3",
        "md:static md:mx-0 md:bg-transparent md:px-0 md:pt-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Inline form-level message (role="alert" for errors, "status" for info). */
export function WizardAlert({ tone, children, className }: { tone: "error" | "info" | "warning"; children: ReactNode; className?: string }) {
  const styles = {
    error: "border-danger bg-danger-soft",
    warning: "border-warning bg-warning-soft",
    info: "border-info bg-info-soft",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-control border-l-4 px-4 py-3 text-label font-normal text-ink", styles[tone], className)}>
      {children}
    </div>
  );
}

/** Review step summary. */
export function ReviewList({ title, items }: { title: string; items: ReadonlyArray<{ label: string; value: ReactNode }> }) {
  return (
    <section aria-label={title} className="rounded-card border border-line bg-canvas p-4 md:p-6">
      <h3 className="font-display text-h3 text-ink">{title}</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-micro uppercase text-ink-muted">{item.label}</dt>
            <dd className="mt-1 break-words text-body font-bold text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
