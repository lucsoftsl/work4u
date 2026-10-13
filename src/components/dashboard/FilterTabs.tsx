"use client";

import { cn } from "@/lib/utils";

export interface FilterTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterTabsProps<T extends string> {
  tabs: readonly FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
}

/**
 * Status filter as underline tabs with counts. Scrolls horizontally on narrow screens with a fade cue
 * on the right edge; selected state is exposed via aria-pressed.
 */
export function FilterTabs<T extends string>({ tabs, value, onChange, label }: FilterTabsProps<T>) {
  return (
    <div className="relative -mx-[var(--gutter)] border-b border-line">
      <div className="overflow-x-auto px-[var(--gutter)]">
        <div role="group" aria-label={label} className="flex min-w-max gap-5 pr-8">
          {tabs.map((tab) => {
            const selected = tab.value === value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(tab.value)}
                className={cn(
                  "relative inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap px-1 text-label transition-colors duration-fast",
                  selected
                    ? "font-bold text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                    : "text-ink-muted hover:text-ink"
                )}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span className={cn("tabular inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 text-caption", selected ? "bg-primary-soft text-primary" : "bg-sunken text-ink-muted")}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas to-transparent md:hidden" />
    </div>
  );
}
