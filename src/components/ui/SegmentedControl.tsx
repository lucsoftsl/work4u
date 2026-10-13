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
  /**
   * "mode" = filled primary segment (Hiring | Working); "plain" = raised surface segment;
   * "tabs" = borderless text tabs with an underline, for switching what a search bar looks for.
   */
  tone?: "plain" | "mode" | "tabs";
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
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        tone === "tabs" ? "inline-flex gap-6" : "inline-flex rounded-control border border-line bg-sunken p-1",
        className
      )}
    >
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
              tone === "tabs"
                ? // Underline grows from the centre; transform keeps the motion on the compositor.
                  "relative min-h-[44px] whitespace-nowrap text-label transition-colors duration-fast " +
                    "after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary " +
                    "after:transition-transform after:duration-normal after:ease-out"
                : "min-h-[36px] min-w-[44px] flex-1 rounded-control px-3 text-label transition-colors duration-fast",
              tone === "tabs"
                ? selected
                  ? "text-ink after:scale-x-100"
                  : "text-ink-muted after:scale-x-0 hover:text-ink"
                : selected
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
