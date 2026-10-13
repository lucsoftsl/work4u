"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ProfileTabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface ProfileTabsProps<T extends string> {
  tabs: readonly ProfileTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}

export const tabId = (id: string) => `profile-tab-${id}`;
export const panelId = (id: string) => `profile-panel-${id}`;

/** WAI-ARIA tabs: roving tabindex, Arrow/Home/End keys, scrolls sideways on narrow screens. */
export function ProfileTabs<T extends string>({ tabs, active, onChange, label }: ProfileTabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-[var(--gutter)] flex gap-1 overflow-x-auto border-b border-line px-[var(--gutter)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                focusTab(index + 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                focusTab(index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                focusTab(0);
              } else if (event.key === "End") {
                event.preventDefault();
                focusTab(tabs.length - 1);
              }
            }}
            className={cn(
              "-mb-px inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-label transition-colors duration-fast",
              selected ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
