"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> { value: T; label: string }

interface Props<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** Native radios (arrow keys, one tab stop, announced as "n of m" for free) dressed as a segmented control. It scrolls inside itself when it does not fit. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const name = useId();

  // Centre the selected item in its own scroller; scrollIntoView would also move the page.
  useEffect(() => {
    const box = ref.current;
    const on = box?.querySelector<HTMLElement>("input:checked")?.parentElement;
    if (!box || !on || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2;
  }, [value]);

  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cn("relative inline-flex max-w-full overflow-x-auto rounded border-2 border-ops-ink bg-ops-surface", className)}>
      {options.map((o) => (
        <label key={o.value} className="relative shrink-0 cursor-pointer border-r border-ops-border last:border-r-0">
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} className="peer sr-only" />
          <span className="flex min-h-[44px] items-center whitespace-nowrap px-3 text-sm font-bold text-ops-ink hover:bg-ops-canvas peer-checked:bg-ops-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-ops-accent peer-checked:peer-focus-visible:outline-white sm:px-4">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
