"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface StatusTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface StatusTabsProps<T extends string> {
  tabs: readonly StatusTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  /** Prefix for ids; the matching panel uses tabPanelProps(). */
  idPrefix: string;
}

export function tabPanelProps(idPrefix: string, value: string) {
  return { role: "tabpanel" as const, id: `${idPrefix}-panel`, "aria-labelledby": `${idPrefix}-tab-${value}`, tabIndex: 0 };
}

/** Horizontally scrolling status tabs (role=tablist, roving tabindex, arrow keys). */
export function StatusTabs<T extends string>({ tabs, value, onChange, label, idPrefix }: StatusTabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (index: number, delta: number) => {
    const next = (index + delta + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="-mx-[var(--gutter)] overflow-x-auto border-b border-line px-[var(--gutter)] md:mx-0 md:px-0">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-1 px-1 pt-1">
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  move(index, 1);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  move(index, -1);
                }
              }}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-3 text-label transition-colors duration-fast",
                selected ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span className={cn("inline-flex min-w-[20px] justify-center rounded-full px-1.5 text-micro tabular", selected ? "bg-primary-soft text-primary" : "bg-sunken text-ink-muted")}>
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
