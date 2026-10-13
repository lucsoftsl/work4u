"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  /** Accessible name of the group (required: it is a radiogroup). */
  label: string;
  /** "mode" = filled primary segment (Hiring | Working); "plain" = raised surface segment. */
  tone?: "plain" | "mode";
  className?: string;
}

/** role="radiogroup" with arrow-key movement; each segment has a 44px target. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, tone = "plain", className }: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (index: number, delta: number) => {
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-control border border-line bg-sunken p-1", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              "min-h-[36px] min-w-[44px] flex-1 rounded-control px-3 text-label transition-colors duration-fast",
              selected
                ? tone === "mode"
                  ? "bg-primary text-on-fill"
                  : "bg-surface text-ink shadow-stamp"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
